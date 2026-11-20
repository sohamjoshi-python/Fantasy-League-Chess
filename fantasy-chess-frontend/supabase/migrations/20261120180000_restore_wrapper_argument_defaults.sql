-- The public wrappers created in 20261119190000 copied argument names and types
-- but not DEFAULT values, so callers that omit optional arguments (for example
-- the scheduled skip job sending only p_timeout_hours) no longer match.
-- Re-declare those wrappers with the original argument list, defaults included.
-- CREATE OR REPLACE keeps the same function and its grants.

DO $migrate$
DECLARE
  fn record;
  call_args text;
  stmt text;
  i integer;
  mode text;
BEGIN
  FOR fn IN
    SELECT
      priv.oid,
      priv.proname,
      priv.proretset,
      priv.proargnames,
      priv.proargmodes,
      pg_get_function_arguments(priv.oid) AS full_args,
      pg_get_function_result(priv.oid) AS result_type
    FROM pg_proc AS priv
    JOIN pg_namespace AS priv_ns ON priv_ns.oid = priv.pronamespace
    JOIN pg_proc AS pub
      ON pub.proname = priv.proname
     AND pub.proargtypes = priv.proargtypes
    JOIN pg_namespace AS pub_ns ON pub_ns.oid = pub.pronamespace
    WHERE priv_ns.nspname = 'app_private'
      AND pub_ns.nspname = 'public'
      AND NOT pub.prosecdef
      AND priv.pronargdefaults > 0
      AND pub.pronargdefaults < priv.pronargdefaults
  LOOP
    IF fn.proargmodes IS NOT NULL
       AND ('o' = ANY (fn.proargmodes) OR 'b' = ANY (fn.proargmodes)) THEN
      RAISE EXCEPTION 'Wrapper for % has OUT arguments; restore its defaults by hand', fn.proname;
    END IF;

    call_args := '';
    FOR i IN 1..COALESCE(array_length(fn.proargnames, 1), 0) LOOP
      mode := CASE WHEN fn.proargmodes IS NULL THEN 'i' ELSE fn.proargmodes[i]::text END;
      IF mode IN ('i', 'v') THEN
        IF call_args <> '' THEN
          call_args := call_args || ', ';
        END IF;
        call_args := call_args || quote_ident(fn.proargnames[i]);
      END IF;
    END LOOP;

    IF fn.result_type = 'void' THEN
      stmt := format('PERFORM app_private.%I(%s);', fn.proname, call_args);
    ELSIF fn.proretset THEN
      stmt := format('RETURN QUERY SELECT * FROM app_private.%I(%s);', fn.proname, call_args);
    ELSE
      stmt := format('RETURN app_private.%I(%s);', fn.proname, call_args);
    END IF;

    EXECUTE format(
      $sql$
        CREATE OR REPLACE FUNCTION public.%I(%s)
        RETURNS %s
        LANGUAGE plpgsql
        SECURITY INVOKER
        SET search_path = app_private, public, extensions
        AS $body$
        BEGIN
          %s
        END;
        $body$
      $sql$,
      fn.proname,
      fn.full_args,
      fn.result_type,
      stmt
    );

    RAISE NOTICE 'Restored argument defaults on public.%', fn.proname;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_proc AS priv
    JOIN pg_namespace AS priv_ns ON priv_ns.oid = priv.pronamespace
    JOIN pg_proc AS pub
      ON pub.proname = priv.proname
     AND pub.proargtypes = priv.proargtypes
    JOIN pg_namespace AS pub_ns ON pub_ns.oid = pub.pronamespace
    WHERE priv_ns.nspname = 'app_private'
      AND pub_ns.nspname = 'public'
      AND pub.pronargdefaults <> priv.pronargdefaults
  ) THEN
    RAISE EXCEPTION 'A public wrapper still has different argument defaults than its original function';
  END IF;
END
$migrate$;

NOTIFY pgrst, 'reload schema';
