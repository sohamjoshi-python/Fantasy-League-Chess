-- TEMP: 5-minute snake-draft clock for league 1465e20b-f06b-4a89-8e3f-d675759af0c4.
-- Re-applies skip_expired_marketplace_turns if 20260917120000 was already run.

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
    timeout_interval interval;
    league_timeout interval;
    test_league_id constant uuid := '1465e20b-f06b-4a89-8e3f-d675759af0c4';
BEGIN
    IF p_timeout_hours IS NULL OR p_timeout_hours <= 0 THEN
        RAISE EXCEPTION 'Timeout must be greater than 0 hours';
    END IF;

    timeout_interval := (p_timeout_hours::text || ' hours')::interval;

    FOR expired_id IN
        SELECT id
        FROM public.leagues
        WHERE COALESCE(marketplace_started, false) = true
          AND COALESCE(marketplace_completed, false) = false
          AND COALESCE(array_length(marketplace_order, 1), 0) > 0
          AND (p_league_id IS NULL OR id = p_league_id)
          AND COALESCE(
                marketplace_turn_started_at,
                marketplace_start_time,
                updated_at,
                created_at
              ) <= NOW() - (
                    CASE
                        WHEN id = test_league_id THEN interval '5 minutes'
                        ELSE timeout_interval
                    END
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

        turn_clock := COALESCE(
            league_row.marketplace_turn_started_at,
            league_row.marketplace_start_time,
            league_row.updated_at,
            league_row.created_at
        );

        IF league_row.id = test_league_id THEN
            league_timeout := interval '5 minutes';
        ELSE
            league_timeout := timeout_interval;
        END IF;

        IF turn_clock IS NULL OR turn_clock > NOW() - league_timeout THEN
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
