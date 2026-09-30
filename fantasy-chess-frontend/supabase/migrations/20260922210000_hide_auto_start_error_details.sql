-- Same error-detail hiding as join_league_atomic, split into its own migration
-- so the CLI can apply one statement per file.

CREATE OR REPLACE FUNCTION public.auto_start_due_marketplaces()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    app_today date;
    league_record RECORD;
    started_ids uuid[] := ARRAY[]::uuid[];
    skipped jsonb := '[]'::jsonb;
    member_count integer;
BEGIN
    app_today := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;

    FOR league_record IN
        SELECT id, name, start_date, member_ids
        FROM public.leagues
        WHERE COALESCE(marketplace_started, false) = false
          AND COALESCE(marketplace_completed, false) = false
          AND COALESCE(draft_completed, false) = false
          AND start_date IS NOT NULL
          AND start_date <= app_today + 7
          AND (end_date IS NULL OR end_date >= app_today)
        FOR UPDATE SKIP LOCKED
    LOOP
        member_count := COALESCE(array_length(league_record.member_ids, 1), 0);
        IF member_count < 2 THEN
            skipped := skipped || jsonb_build_object(
                'id', league_record.id,
                'name', league_record.name,
                'start_date', league_record.start_date,
                'member_count', member_count,
                'reason', 'Need at least 2 members'
            );
            CONTINUE;
        END IF;

        BEGIN
            PERFORM public.start_marketplace(league_record.id);
            started_ids := started_ids || league_record.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'auto_start_due_marketplaces failed for league %: %', league_record.id, SQLERRM;
            skipped := skipped || jsonb_build_object(
                'id', league_record.id,
                'name', league_record.name,
                'start_date', league_record.start_date,
                'reason', 'Could not start marketplace'
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'as_of', app_today,
        'started_count', COALESCE(array_length(started_ids, 1), 0),
        'started_ids', to_jsonb(started_ids),
        'skipped', skipped
    );
END;
$$;
