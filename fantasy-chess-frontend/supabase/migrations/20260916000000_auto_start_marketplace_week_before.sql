-- Auto-start the turn-based marketplace one week before league start_date
-- if the owner has not started it, and require 7 days of lead time on create.

DROP FUNCTION IF EXISTS public.start_marketplace(UUID);

CREATE OR REPLACE FUNCTION public.start_marketplace(p_league_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    league_record RECORD;
    ordered_members UUID[];
    marketplace_order UUID[];
    member_count INTEGER;
    total_rounds INTEGER;
    round_num INTEGER;
    player_index INTEGER;
BEGIN
    SELECT * INTO league_record
    FROM public.leagues
    WHERE id = p_league_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'League not found';
    END IF;

    IF COALESCE(league_record.marketplace_started, false)
       OR COALESCE(league_record.marketplace_completed, false) THEN
        RETURN;
    END IF;

    SELECT ARRAY(
        SELECT sub.member_id
        FROM (
            SELECT DISTINCT ON (u.member_id)
                u.member_id,
                u.ord,
                (b.id IS NOT NULL) AS is_bot
            FROM unnest(COALESCE(league_record.member_ids, ARRAY[]::uuid[]))
                WITH ORDINALITY AS u(member_id, ord)
            LEFT JOIN public.bots b ON b.id = u.member_id
            ORDER BY u.member_id, u.ord
        ) sub
        ORDER BY sub.is_bot, sub.ord
    ) INTO ordered_members;

    member_count := COALESCE(array_length(ordered_members, 1), 0);
    IF member_count < 2 THEN
        RAISE EXCEPTION 'Need at least 2 league members to start a snake draft';
    END IF;

    total_rounds := GREATEST(COALESCE(league_record.max_players_per_team, 10), 1);
    marketplace_order := ARRAY[]::uuid[];

    FOR round_num IN 0..(total_rounds - 1) LOOP
        IF round_num % 2 = 0 THEN
            FOR player_index IN 1..member_count LOOP
                marketplace_order := marketplace_order || ordered_members[player_index];
            END LOOP;
        ELSE
            FOR player_index IN REVERSE member_count..1 LOOP
                marketplace_order := marketplace_order || ordered_members[player_index];
            END LOOP;
        END IF;
    END LOOP;

    UPDATE public.leagues
    SET
        marketplace_started = true,
        marketplace_start_time = NOW(),
        marketplace_order = marketplace_order,
        current_marketplace_turn = 0,
        marketplace_completed = false
    WHERE id = p_league_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_marketplace(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_marketplace(UUID) TO service_role;

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
        SELECT id, member_ids
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
                'reason', 'Need at least 2 members'
            );
            CONTINUE;
        END IF;

        BEGIN
            PERFORM public.start_marketplace(league_record.id);
            started_ids := started_ids || league_record.id;
        EXCEPTION WHEN OTHERS THEN
            skipped := skipped || jsonb_build_object(
                'id', league_record.id,
                'reason', SQLERRM
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

GRANT EXECUTE ON FUNCTION public.auto_start_due_marketplaces() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_start_due_marketplaces() TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_league_min_start_lead_time()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    app_today date;
    min_start date;
BEGIN
    app_today := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
    min_start := app_today + 7;

    IF NEW.start_date IS NULL OR NEW.start_date < min_start THEN
        RAISE EXCEPTION 'League start date must be at least 7 days from today (%).', min_start;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_league_min_start_lead_time ON public.leagues;
CREATE TRIGGER trg_enforce_league_min_start_lead_time
    BEFORE INSERT ON public.leagues
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_league_min_start_lead_time();
