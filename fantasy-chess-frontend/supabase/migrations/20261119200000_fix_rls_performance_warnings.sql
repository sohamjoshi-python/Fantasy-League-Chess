-- Performance advisor: cache auth checks once per query, keep a single
-- permissive policy per role and action, and drop one duplicated index.
-- No tables, functions, or rows are removed. Overlapping policies are combined
-- with OR, so a row that was allowed before is still allowed.

CREATE OR REPLACE FUNCTION app_private.wrap_rls_initplan(expr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  i integer := 1;
  n integer;
  out text := '';
  ch text;
  rest text;
  paren_pos integer;
  end_pos integer;
  depth integer;
  in_str boolean;
  call_text text;
BEGIN
  IF expr IS NULL THEN
    RETURN NULL;
  END IF;

  n := char_length(expr);
  WHILE i <= n LOOP
    ch := substring(expr FROM i FOR 1);

    IF ch = '''' THEN
      out := out || ch;
      i := i + 1;
      WHILE i <= n LOOP
        ch := substring(expr FROM i FOR 1);
        out := out || ch;
        i := i + 1;
        IF ch = '''' THEN
          IF i <= n AND substring(expr FROM i FOR 1) = '''' THEN
            out := out || '''';
            i := i + 1;
          ELSE
            EXIT;
          END IF;
        END IF;
      END LOOP;
      CONTINUE;
    END IF;

    rest := substring(expr FROM i);
    IF (i = 1 OR substring(expr FROM i - 1 FOR 1) !~ '[A-Za-z0-9_"]')
       AND rest ~* '^(auth\s*\.\s*(uid|role|jwt|email)|"auth"\s*\.\s*"(uid|role|jwt|email)"|current_setting|pg_catalog\s*\.\s*current_setting)\s*\('
    THEN
      paren_pos := i + position('(' IN rest) - 1;
      depth := 0;
      in_str := false;
      end_pos := paren_pos;
      WHILE end_pos <= n LOOP
        ch := substring(expr FROM end_pos FOR 1);
        IF in_str THEN
          IF ch = '''' AND substring(expr FROM end_pos FOR 2) = '''''' THEN
            end_pos := end_pos + 2;
            CONTINUE;
          ELSIF ch = '''' THEN
            in_str := false;
          END IF;
          end_pos := end_pos + 1;
        ELSE
          IF ch = '''' THEN
            in_str := true;
            end_pos := end_pos + 1;
          ELSIF ch = '(' THEN
            depth := depth + 1;
            end_pos := end_pos + 1;
          ELSIF ch = ')' THEN
            depth := depth - 1;
            IF depth = 0 THEN
              EXIT;
            END IF;
            end_pos := end_pos + 1;
          ELSE
            end_pos := end_pos + 1;
          END IF;
        END IF;
      END LOOP;

      call_text := substring(expr FROM i FOR end_pos - i + 1);
      IF substring(expr FROM 1 FOR i - 1) ~* '\(\s*select\s*$' THEN
        out := out || call_text;
      ELSE
        out := out || '(select ' || call_text || ')';
      END IF;
      i := end_pos + 1;
      CONTINUE;
    END IF;

    out := out || ch;
    i := i + 1;
  END LOOP;

  RETURN out;
END;
$$;

DO $migrate$
DECLARE
  pol record;
  grp record;
  old_pol record;
  new_qual text;
  new_chk text;
  role_list text;
  clause text;
  policy_name text;
  seq bigint;
BEGIN
  -- Cache auth.uid() and current_setting() once per query.
  FOR pol IN
    SELECT
      c.relname AS tbl,
      p.polname,
      pg_get_expr(p.polqual, p.polrelid) AS qual,
      pg_get_expr(p.polwithcheck, p.polrelid) AS chk
    FROM pg_policy AS p
    JOIN pg_class AS c ON c.oid = p.polrelid
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    new_qual := app_private.wrap_rls_initplan(pol.qual);
    new_chk := app_private.wrap_rls_initplan(pol.chk);

    IF pol.qual IS NOT NULL AND new_qual IS DISTINCT FROM pol.qual THEN
      EXECUTE 'ALTER POLICY ' || quote_ident(pol.polname)
        || ' ON public.' || quote_ident(pol.tbl)
        || ' USING (' || new_qual || ')';
    END IF;

    IF pol.chk IS NOT NULL AND new_chk IS DISTINCT FROM pol.chk THEN
      EXECUTE 'ALTER POLICY ' || quote_ident(pol.polname)
        || ' ON public.' || quote_ident(pol.tbl)
        || ' WITH CHECK (' || new_chk || ')';
    END IF;
  END LOOP;

  -- This policy grants nothing. It only makes Postgres evaluate a second policy.
  FOR pol IN
    SELECT c.relname AS tbl
    FROM pg_policy AS p
    JOIN pg_class AS c ON c.oid = p.polrelid
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND p.polname = 'Enable all operations for all users'
      AND lower(regexp_replace(COALESCE(pg_get_expr(p.polqual, p.polrelid), 'true'), '[[:space:]()]', '', 'g')) = 'false'
      AND lower(regexp_replace(COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), pg_get_expr(p.polqual, p.polrelid), 'true'), '[[:space:]()]', '', 'g')) = 'false'
  LOOP
    EXECUTE 'DROP POLICY ' || quote_ident('Enable all operations for all users')
      || ' ON public.' || quote_ident(pol.tbl);
  END LOOP;

  CREATE TEMP TABLE _rls_pol ON COMMIT DROP AS
  SELECT
    c.relname AS tbl,
    p.polname,
    p.polpermissive,
    p.polroles,
    p.polcmd::text AS polcmd,
    pg_get_expr(p.polqual, p.polrelid) AS qual,
    pg_get_expr(p.polwithcheck, p.polrelid) AS chk
  FROM pg_policy AS p
  JOIN pg_class AS c ON c.oid = p.polrelid
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND p.polpermissive;

  CREATE TEMP TABLE _rls_roles ON COMMIT DROP AS
  SELECT r.oid, r.rolname
  FROM pg_roles AS r
  WHERE r.rolname NOT LIKE 'pg_%'
    AND r.rolname NOT LIKE 'supabase%admin'
    AND NOT r.rolbypassrls;

  CREATE TEMP TABLE _rls_expanded ON COMMIT DROP AS
  SELECT
    src.tbl,
    src.polname,
    act.cmd,
    role_row.rolname,
    CASE
      WHEN act.cmd IN ('SELECT', 'DELETE', 'UPDATE') THEN COALESCE(src.qual, 'true')
      ELSE ''
    END AS using_expr,
    CASE
      WHEN act.cmd IN ('INSERT', 'UPDATE') THEN COALESCE(src.chk, src.qual, 'true')
      ELSE ''
    END AS check_expr
  FROM _rls_pol AS src
  JOIN LATERAL (
    SELECT unnest(
      CASE src.polcmd
        WHEN 'r' THEN ARRAY['SELECT']
        WHEN 'a' THEN ARRAY['INSERT']
        WHEN 'w' THEN ARRAY['UPDATE']
        WHEN 'd' THEN ARRAY['DELETE']
        WHEN '*' THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
        ELSE ARRAY[]::text[]
      END
    ) AS cmd
  ) AS act ON true
  JOIN _rls_roles AS role_row
    ON src.polroles @> ARRAY[role_row.oid]
    OR src.polroles = ARRAY[0::oid];

  CREATE TEMP TABLE _rls_merge_tables ON COMMIT DROP AS
  SELECT DISTINCT tbl
  FROM _rls_expanded
  GROUP BY tbl, rolname, cmd
  HAVING count(*) > 1;

  CREATE TEMP TABLE _rls_per_role ON COMMIT DROP AS
  SELECT
    tbl,
    cmd,
    rolname,
    CASE
      WHEN cmd = 'INSERT' THEN ''
      WHEN has_true_using THEN 'true'
      ELSE using_expr
    END AS using_expr,
    CASE
      WHEN cmd IN ('SELECT', 'DELETE') THEN ''
      WHEN has_true_check THEN 'true'
      ELSE check_expr
    END AS check_expr
  FROM (
    SELECT
      tbl,
      cmd,
      rolname,
      bool_or(lower(regexp_replace(using_expr, '[[:space:]()]', '', 'g')) = 'true') AS has_true_using,
      bool_or(lower(regexp_replace(check_expr, '[[:space:]()]', '', 'g')) = 'true') AS has_true_check,
      string_agg(DISTINCT '(' || using_expr || ')', ' OR ') AS using_expr,
      string_agg(DISTINCT '(' || check_expr || ')', ' OR ') AS check_expr
    FROM _rls_expanded
    WHERE tbl IN (SELECT merge_tbl.tbl FROM _rls_merge_tables AS merge_tbl)
    GROUP BY tbl, cmd, rolname
  ) AS per_role;

  CREATE TEMP TABLE _rls_groups ON COMMIT DROP AS
  SELECT
    grouped.tbl,
    grouped.cmd,
    grouped.using_expr,
    grouped.check_expr,
    grouped.roles,
    row_number() OVER (
      PARTITION BY grouped.tbl, grouped.cmd
      ORDER BY grouped.using_expr, grouped.check_expr
    ) AS grp
  FROM (
    SELECT
      tbl,
      cmd,
      using_expr,
      check_expr,
      array_agg(rolname ORDER BY rolname) AS roles
    FROM _rls_per_role
    GROUP BY tbl, cmd, using_expr, check_expr
  ) AS grouped;

  FOR grp IN
    SELECT * FROM _rls_groups
  LOOP
    SELECT string_agg(quote_ident(role_name), ', ' ORDER BY role_name)
    INTO role_list
    FROM unnest(grp.roles) AS role_name;

    clause := '';
    IF grp.cmd IN ('SELECT', 'DELETE', 'UPDATE') AND grp.using_expr <> '' THEN
      clause := clause || ' USING (' || app_private.wrap_rls_initplan(grp.using_expr) || ')';
    END IF;
    IF grp.cmd IN ('INSERT', 'UPDATE') AND grp.check_expr <> '' THEN
      clause := clause || ' WITH CHECK (' || app_private.wrap_rls_initplan(grp.check_expr) || ')';
    END IF;

    IF clause = '' THEN
      RAISE EXCEPTION 'Could not rebuild the % policy on %', grp.cmd, grp.tbl;
    END IF;

    policy_name := 'flc_' || lower(grp.cmd) || '_' || grp.grp::text;
    EXECUTE 'CREATE POLICY ' || quote_ident(policy_name)
      || ' ON public.' || quote_ident(grp.tbl)
      || ' FOR ' || grp.cmd
      || ' TO ' || role_list
      || clause;
  END LOOP;

  FOR old_pol IN
    SELECT tbl, polname
    FROM _rls_pol
    WHERE tbl IN (SELECT tbl FROM _rls_merge_tables)
  LOOP
    EXECUTE 'DROP POLICY ' || quote_ident(old_pol.polname)
      || ' ON public.' || quote_ident(old_pol.tbl);
  END LOOP;

  -- Two identical unique indexes. Keep the constraint index.
  IF to_regclass('public.league_coin_balances_user_id_league_id_key') IS NOT NULL
     AND to_regclass('public.league_coin_balances_user_league_unique') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM pg_index AS kept
       JOIN pg_index AS extra
         ON extra.indexrelid = 'public.league_coin_balances_user_league_unique'::regclass
       WHERE kept.indexrelid = 'public.league_coin_balances_user_id_league_id_key'::regclass
         AND kept.indkey = extra.indkey
         AND kept.indisunique = extra.indisunique
         AND kept.indpred IS NOT DISTINCT FROM extra.indpred
         AND kept.indexprs IS NOT DISTINCT FROM extra.indexprs
     )
  THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conindid = 'public.league_coin_balances_user_league_unique'::regclass
    ) THEN
      EXECUTE (
        SELECT format(
          'ALTER TABLE public.league_coin_balances DROP CONSTRAINT %I',
          conname
        )
        FROM pg_constraint
        WHERE conindid = 'public.league_coin_balances_user_league_unique'::regclass
        LIMIT 1
      );
    ELSE
      EXECUTE 'DROP INDEX public.league_coin_balances_user_league_unique';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%auth.uid()%' AND lower(qual) NOT LIKE '%select auth.uid()%')
        OR (qual LIKE '%auth.jwt()%' AND lower(qual) NOT LIKE '%select auth.jwt()%')
        OR (qual LIKE '%auth.role()%' AND lower(qual) NOT LIKE '%select auth.role()%')
        OR (qual LIKE '%auth.email()%' AND lower(qual) NOT LIKE '%select auth.email()%')
        OR (qual LIKE '%current\_setting(%)%' AND lower(qual) NOT LIKE '%select current\_setting(%)%')
        OR (with_check LIKE '%auth.uid()%' AND lower(with_check) NOT LIKE '%select auth.uid()%')
        OR (with_check LIKE '%auth.jwt()%' AND lower(with_check) NOT LIKE '%select auth.jwt()%')
        OR (with_check LIKE '%auth.role()%' AND lower(with_check) NOT LIKE '%select auth.role()%')
        OR (with_check LIKE '%auth.email()%' AND lower(with_check) NOT LIKE '%select auth.email()%')
        OR (with_check LIKE '%current\_setting(%)%' AND lower(with_check) NOT LIKE '%select current\_setting(%)%')
      )
  ) THEN
    RAISE EXCEPTION 'An RLS policy still calls auth or current_setting on every row';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policy AS p
    JOIN pg_class AS c ON c.oid = p.polrelid
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    JOIN pg_roles AS r
      ON p.polroles @> ARRAY[r.oid]
      OR p.polroles = ARRAY[0::oid]
    JOIN LATERAL (
      SELECT unnest(
        CASE p.polcmd
          WHEN 'r' THEN ARRAY['SELECT']
          WHEN 'a' THEN ARRAY['INSERT']
          WHEN 'w' THEN ARRAY['UPDATE']
          WHEN 'd' THEN ARRAY['DELETE']
          WHEN '*' THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
          ELSE ARRAY[]::text[]
        END
      ) AS cmd
    ) AS act ON true
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND p.polpermissive
      AND r.rolname NOT LIKE 'pg_%'
      AND r.rolname NOT LIKE 'supabase%admin'
      AND NOT r.rolbypassrls
    GROUP BY c.relname, r.rolname, act.cmd
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A table still has more than one permissive policy for the same role and action';
  END IF;

  SELECT count(*) INTO seq FROM _rls_groups;
  RAISE NOTICE 'Combined overlapping policies into % replacements', seq;
END
$migrate$;

DROP FUNCTION app_private.wrap_rls_initplan(text);

NOTIFY pgrst, 'reload schema';
