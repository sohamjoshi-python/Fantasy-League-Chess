-- Hide private league names on the global leaderboard.
-- Members and the creator still see the real name. Everyone else sees "Private league".
-- The original ranking functions are kept and locked down so their names cannot be read directly.

CREATE OR REPLACE FUNCTION public.viewer_can_see_league_name(p_league_name text, p_participant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leagues AS league
    WHERE league.name = p_league_name
      AND (
        p_participant_id = league.creator_id
        OR p_participant_id = ANY(COALESCE(league.member_ids, ARRAY[]::uuid[]))
        OR EXISTS (
          SELECT 1
          FROM public.lineups
          WHERE lineups.league_id = league.id
            AND lineups.user_id = p_participant_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.payouts
          WHERE payouts.league_id = league.id
            AND payouts.user_id = p_participant_id
        )
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.leagues AS league
    WHERE league.name = p_league_name
      AND (
        p_participant_id = league.creator_id
        OR p_participant_id = ANY(COALESCE(league.member_ids, ARRAY[]::uuid[]))
        OR EXISTS (
          SELECT 1
          FROM public.lineups
          WHERE lineups.league_id = league.id
            AND lineups.user_id = p_participant_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.payouts
          WHERE payouts.league_id = league.id
            AND payouts.user_id = p_participant_id
        )
      )
      AND NOT (
        COALESCE(league.is_public, false)
        OR auth.uid() = league.creator_id
        OR auth.uid() = ANY(COALESCE(league.member_ids, ARRAY[]::uuid[]))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.viewer_can_see_league_name(text, uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  recent_count integer;
  weekly_count integer;
  weekly_args text;
  weekly_call text;
BEGIN
  SELECT count(*)
  INTO recent_count
  FROM pg_proc
  JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
  WHERE pg_namespace.nspname = 'public'
    AND pg_proc.proname = 'get_recent_winners';

  SELECT count(*)
  INTO weekly_count
  FROM pg_proc
  JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
  WHERE pg_namespace.nspname = 'public'
    AND pg_proc.proname = 'get_weekly_top_performers';

  IF recent_count <> 1 THEN
    RAISE EXCEPTION 'Expected one get_recent_winners function, found %', recent_count;
  END IF;

  IF weekly_count <> 1 THEN
    RAISE EXCEPTION 'Expected one get_weekly_top_performers function, found %', weekly_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_proc.proname = 'get_recent_winners_raw'
  ) THEN
    EXECUTE (
      SELECT format(
        'ALTER FUNCTION public.get_recent_winners(%s) RENAME TO get_recent_winners_raw',
        pg_get_function_identity_arguments(pg_proc.oid)
      )
      FROM pg_proc
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
      WHERE pg_namespace.nspname = 'public'
        AND pg_proc.proname = 'get_recent_winners'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_proc.proname = 'get_weekly_top_performers_raw'
  ) THEN
    EXECUTE (
      SELECT format(
        'ALTER FUNCTION public.get_weekly_top_performers(%s) RENAME TO get_weekly_top_performers_raw',
        pg_get_function_identity_arguments(pg_proc.oid)
      )
      FROM pg_proc
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
      WHERE pg_namespace.nspname = 'public'
        AND pg_proc.proname = 'get_weekly_top_performers'
    );
  END IF;

  SELECT pg_get_function_identity_arguments(pg_proc.oid)
  INTO weekly_args
  FROM pg_proc
  JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
  WHERE pg_namespace.nspname = 'public'
    AND pg_proc.proname = 'get_weekly_top_performers_raw';

  IF weekly_args LIKE '%,%' THEN
    RAISE EXCEPTION 'Unexpected weekly leaderboard signature: %', weekly_args;
  END IF;

  IF weekly_args ILIKE '%text%' THEN
    weekly_call := 'public.get_weekly_top_performers_raw(week_date::text)';
  ELSIF weekly_args ILIKE '%timestamp%' THEN
    weekly_call := 'public.get_weekly_top_performers_raw(week_date::timestamptz)';
  ELSE
    weekly_call := 'public.get_weekly_top_performers_raw(week_date)';
  END IF;

  EXECUTE format(
    'REVOKE ALL ON FUNCTION public.get_recent_winners_raw(%s) FROM PUBLIC, anon, authenticated',
    (
      SELECT pg_get_function_identity_arguments(pg_proc.oid)
      FROM pg_proc
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
      WHERE pg_namespace.nspname = 'public'
        AND pg_proc.proname = 'get_recent_winners_raw'
    )
  );

  EXECUTE format(
    'REVOKE ALL ON FUNCTION public.get_weekly_top_performers_raw(%s) FROM PUBLIC, anon, authenticated',
    weekly_args
  );

  EXECUTE format($fn$
    CREATE OR REPLACE FUNCTION public.get_weekly_top_performers(week_date date)
    RETURNS TABLE (
      user_id uuid,
      username text,
      league_name text,
      week_points numeric,
      avatar_url text
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $body$
      SELECT
        NULLIF(src.entry->>'user_id', '')::uuid AS user_id,
        src.entry->>'username' AS username,
        CASE
          WHEN public.viewer_can_see_league_name(
            src.entry->>'league_name',
            NULLIF(src.entry->>'user_id', '')::uuid
          )
          THEN src.entry->>'league_name'
          ELSE 'Private league'
        END AS league_name,
        COALESCE(
          NULLIF(src.entry->>'week_points', '')::numeric,
          NULLIF(src.entry->>'total_points', '')::numeric,
          NULLIF(src.entry->>'points', '')::numeric,
          0
        ) AS week_points,
        COALESCE(
          src.entry->>'avatar_url',
          src.entry->>'selected_avatar_url'
        ) AS avatar_url
      FROM (
        SELECT (to_jsonb(ranked) - 'ordinality') AS entry, ranked.ordinality
        FROM %s WITH ORDINALITY AS ranked
      ) AS src
      ORDER BY src.ordinality
    $body$;
  $fn$, weekly_call);
END $$;

CREATE OR REPLACE FUNCTION public.get_recent_winners()
RETURNS TABLE (
  user_id uuid,
  username text,
  league_name text,
  prize_amount numeric,
  won_date text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NULLIF(src.entry->>'user_id', '')::uuid AS user_id,
    src.entry->>'username' AS username,
    CASE
      WHEN public.viewer_can_see_league_name(
        src.entry->>'league_name',
        NULLIF(src.entry->>'user_id', '')::uuid
      )
      THEN src.entry->>'league_name'
      ELSE 'Private league'
    END AS league_name,
    COALESCE(
      NULLIF(src.entry->>'prize_amount', '')::numeric,
      NULLIF(src.entry->>'amount', '')::numeric,
      NULLIF(src.entry->>'prize', '')::numeric,
      0
    ) AS prize_amount,
    COALESCE(
      src.entry->>'won_date',
      src.entry->>'end_date',
      src.entry->>'processed_at'
    ) AS won_date,
    COALESCE(
      src.entry->>'avatar_url',
      src.entry->>'selected_avatar_url'
    ) AS avatar_url
  FROM (
    SELECT (to_jsonb(ranked) - 'ordinality') AS entry, ranked.ordinality
    FROM public.get_recent_winners_raw() WITH ORDINALITY AS ranked
  ) AS src
  ORDER BY src.ordinality;
$$;

REVOKE ALL ON FUNCTION public.get_recent_winners() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_weekly_top_performers(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_winners() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_top_performers(date) TO anon, authenticated;

DO $$
DECLARE
  sample jsonb;
BEGIN
  SELECT to_jsonb(raw_row) - 'ordinality'
  INTO sample
  FROM public.get_recent_winners_raw() WITH ORDINALITY AS raw_row
  LIMIT 1;

  IF sample IS NOT NULL AND NOT (sample ? 'user_id' AND sample ? 'league_name') THEN
    RAISE EXCEPTION 'get_recent_winners_raw columns: %', (
      SELECT string_agg(key, ', ' ORDER BY key)
      FROM jsonb_object_keys(sample) AS key
    );
  END IF;

  PERFORM 1 FROM public.get_recent_winners() LIMIT 1;
  PERFORM 1 FROM public.get_weekly_top_performers(CURRENT_DATE) LIMIT 1;
END $$;

NOTIFY pgrst, 'reload schema';
