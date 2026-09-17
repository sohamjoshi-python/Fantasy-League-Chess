-- Skip a snake-draft pick if the current manager has not acted in 12 hours.
-- Clock resets whenever current_marketplace_turn changes (buy, skip, or bot pick).
-- Existing in-progress drafts: if nobody has picked yet, inherit marketplace_start_time
-- so a days-old stall expires immediately. Later turns start a fresh 12-hour clock
-- so we do not skip someone who just received the pick.

ALTER TABLE public.leagues
    ADD COLUMN IF NOT EXISTS marketplace_turn_started_at timestamptz;

UPDATE public.leagues
SET marketplace_turn_started_at = CASE
    WHEN COALESCE(current_marketplace_turn, 0) = 0 THEN COALESCE(
        marketplace_start_time,
        updated_at,
        created_at,
        NOW()
    )
    ELSE NOW()
END
WHERE COALESCE(marketplace_started, false) = true
  AND COALESCE(marketplace_completed, false) = false
  AND marketplace_turn_started_at IS NULL;

CREATE OR REPLACE FUNCTION public.reset_marketplace_turn_clock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF COALESCE(OLD.marketplace_started, false) = false
           AND COALESCE(NEW.marketplace_started, false) = true THEN
            NEW.marketplace_turn_started_at := COALESCE(NEW.marketplace_turn_started_at, NOW());
        ELSIF NEW.current_marketplace_turn IS DISTINCT FROM OLD.current_marketplace_turn THEN
            NEW.marketplace_turn_started_at := NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_marketplace_turn_clock ON public.leagues;
CREATE TRIGGER trg_reset_marketplace_turn_clock
    BEFORE UPDATE ON public.leagues
    FOR EACH ROW
    EXECUTE PROCEDURE public.reset_marketplace_turn_clock();

CREATE OR REPLACE FUNCTION public.start_marketplace(p_league_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
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
        marketplace_completed = false,
        marketplace_turn_started_at = NOW()
    WHERE id = p_league_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_marketplace(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_marketplace(UUID) TO service_role;

DROP FUNCTION IF EXISTS public.skip_expired_marketplace_turns(numeric);

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

GRANT EXECUTE ON FUNCTION public.skip_expired_marketplace_turns(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_expired_marketplace_turns(numeric, uuid) TO service_role;
