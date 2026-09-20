-- Pick clocks shrink so 3 * member_count turns fit before start_date (PT).
-- Floor 15 minutes, cap 12 hours. At/after start_date the draft is force-completed.
-- 5-minute test leagues are unchanged.

CREATE OR REPLACE FUNCTION public.marketplace_turn_timeout_hours(p_league_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    league_row public.leagues%ROWTYPE;
    remaining_picks integer;
    hours_left numeric;
    start_ts timestamptz;
BEGIN
    IF p_league_id IS NOT NULL AND public.is_five_minute_draft_league(p_league_id) THEN
        RETURN 5.0 / 60.0;
    END IF;

    IF p_league_id IS NULL THEN
        RETURN 12;
    END IF;

    SELECT * INTO league_row
    FROM public.leagues
    WHERE id = p_league_id;

    IF NOT FOUND THEN
        RETURN 12;
    END IF;

    remaining_picks := GREATEST(
        COALESCE(array_length(league_row.marketplace_order, 1), 0)
        - COALESCE(league_row.current_marketplace_turn, 0),
        1
    );

    IF league_row.start_date IS NULL THEN
        RETURN 12;
    END IF;

    start_ts := (league_row.start_date::timestamp AT TIME ZONE 'America/Los_Angeles');
    hours_left := EXTRACT(EPOCH FROM (start_ts - NOW())) / 3600.0;

    IF hours_left IS NULL OR hours_left <= 0 THEN
        RETURN 1.0 / 60.0;
    END IF;

    RETURN LEAST(12, GREATEST(0.25, hours_left / remaining_picks));
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_turn_timeout_interval(p_league_id uuid)
RETURNS interval
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (public.marketplace_turn_timeout_hours(p_league_id)::text || ' hours')::interval;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_turn_timeout_label(p_league_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    hours numeric;
    minutes integer;
BEGIN
    hours := public.marketplace_turn_timeout_hours(p_league_id);
    IF hours < 1 THEN
        minutes := GREATEST(1, ROUND(hours * 60)::integer);
        IF minutes = 1 THEN
            RETURN '1 minute';
        END IF;
        RETURN minutes::text || ' minutes';
    END IF;
    IF ROUND(hours, 1) = 1 THEN
        RETURN '1 hour';
    END IF;
    IF hours >= 10 THEN
        RETURN ROUND(hours)::integer::text || ' hours';
    END IF;
    RETURN TRIM(TO_CHAR(ROUND(hours, 1), 'FM9990.0')) || ' hours';
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_turn_timeout_hours(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_turn_timeout_hours(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketplace_turn_timeout_interval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_turn_timeout_interval(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketplace_turn_timeout_label(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_turn_timeout_label(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.skip_expired_marketplace_turns(
    p_timeout_hours numeric DEFAULT 12,
    p_league_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expired_id uuid;
    league_row public.leagues%ROWTYPE;
    current_picker uuid;
    new_turn integer;
    total_turns integer;
    turn_clock timestamptz;
    is_bot boolean;
    skipped jsonb := '[]'::jsonb;
    skipped_ids uuid[] := ARRAY[]::uuid[];
    league_timeout interval;
    pt_today date;
BEGIN
    IF p_timeout_hours IS NULL OR p_timeout_hours <= 0 THEN
        RAISE EXCEPTION 'Timeout must be greater than 0 hours';
    END IF;

    pt_today := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;

    FOR expired_id IN
        SELECT id
        FROM public.leagues
        WHERE COALESCE(marketplace_started, false) = true
          AND COALESCE(marketplace_completed, false) = false
          AND COALESCE(array_length(marketplace_order, 1), 0) > 0
          AND (p_league_id IS NULL OR id = p_league_id)
          AND (
                COALESCE(
                    marketplace_turn_started_at,
                    marketplace_start_time,
                    updated_at,
                    created_at
                ) <= NOW() - public.marketplace_turn_timeout_interval(id)
                OR (start_date IS NOT NULL AND start_date <= pt_today)
          )
        FOR UPDATE SKIP LOCKED
    LOOP
        SELECT * INTO league_row
        FROM public.leagues
        WHERE id = expired_id;

        IF NOT FOUND
           OR COALESCE(league_row.marketplace_completed, false)
           OR COALESCE(league_row.marketplace_started, false) = false THEN
            CONTINUE;
        END IF;

        total_turns := COALESCE(array_length(league_row.marketplace_order, 1), 0);
        IF total_turns = 0
           OR COALESCE(league_row.current_marketplace_turn, 0) >= total_turns THEN
            UPDATE public.leagues
            SET marketplace_completed = true,
                draft_completed = true
            WHERE id = league_row.id;
            CONTINUE;
        END IF;

        IF league_row.start_date IS NOT NULL AND league_row.start_date <= pt_today THEN
            UPDATE public.leagues
            SET
                current_marketplace_turn = total_turns,
                marketplace_completed = true,
                draft_completed = true
            WHERE id = league_row.id;
            skipped_ids := skipped_ids || league_row.id;
            skipped := skipped || jsonb_build_object(
                'league_id', league_row.id,
                'reason', 'league_start_date_reached',
                'completed', true
            );
            CONTINUE;
        END IF;

        turn_clock := COALESCE(
            league_row.marketplace_turn_started_at,
            league_row.marketplace_start_time,
            league_row.updated_at,
            league_row.created_at
        );

        league_timeout := public.marketplace_turn_timeout_interval(league_row.id);

        IF turn_clock IS NULL OR turn_clock > NOW() - league_timeout THEN
            CONTINUE;
        END IF;

        current_picker := league_row.marketplace_order[league_row.current_marketplace_turn + 1];
        new_turn := COALESCE(league_row.current_marketplace_turn, 0) + 1;

        IF current_picker IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.bots b WHERE b.id = current_picker
            ) INTO is_bot;

            BEGIN
                INSERT INTO public.marketplace_turns (
                    league_id,
                    user_id,
                    bot_id,
                    turn_number,
                    action_type
                ) VALUES (
                    league_row.id,
                    CASE WHEN is_bot THEN NULL ELSE current_picker END,
                    CASE WHEN is_bot THEN current_picker ELSE NULL END,
                    COALESCE(league_row.current_marketplace_turn, 0),
                    'skip'
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        UPDATE public.leagues
        SET
            current_marketplace_turn = new_turn,
            marketplace_completed = (new_turn >= total_turns),
            draft_completed = CASE
                WHEN new_turn >= total_turns THEN true
                ELSE draft_completed
            END
        WHERE id = league_row.id;

        skipped_ids := skipped_ids || league_row.id;
        skipped := skipped || jsonb_build_object(
            'league_id', league_row.id,
            'skipped_user_id', current_picker,
            'from_turn', COALESCE(league_row.current_marketplace_turn, 0),
            'to_turn', new_turn,
            'completed', new_turn >= total_turns
        );
    END LOOP;

    RETURN jsonb_build_object(
        'timeout_hours', p_timeout_hours,
        'league_id', p_league_id,
        'skipped_count', COALESCE(array_length(skipped_ids, 1), 0),
        'skipped', skipped
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.skip_expired_marketplace_turns(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_expired_marketplace_turns(numeric, uuid) TO service_role;
