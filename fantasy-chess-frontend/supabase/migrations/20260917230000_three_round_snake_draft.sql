-- Snake draft is 3 rounds per manager. Team size in the open marketplace stays
-- max_players_per_team (default 10).

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
    total_rounds INTEGER := 3;
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

-- Shorten in-progress drafts that were built with 10 rounds.
DO $$
DECLARE
    league_row public.leagues%ROWTYPE;
    participants uuid[];
    new_order uuid[];
    member_count integer;
    round_num integer;
    player_index integer;
    total_rounds integer := 3;
BEGIN
    FOR league_row IN
        SELECT *
        FROM public.leagues
        WHERE COALESCE(marketplace_started, false) = true
          AND COALESCE(marketplace_completed, false) = false
          AND COALESCE(array_length(marketplace_order, 1), 0) > 0
        FOR UPDATE
    LOOP
        SELECT ARRAY(
            SELECT participant_id
            FROM (
                SELECT participant_id, MIN(ord) AS first_ord
                FROM unnest(COALESCE(league_row.marketplace_order, ARRAY[]::uuid[]))
                    WITH ORDINALITY AS x(participant_id, ord)
                WHERE participant_id IS NOT NULL
                  AND NOT (
                      participant_id = ANY (
                          COALESCE(league_row.marketplace_withdrawn_ids, ARRAY[]::uuid[])
                      )
                  )
                GROUP BY participant_id
            ) s
            ORDER BY first_ord
        ) INTO participants;

        member_count := COALESCE(array_length(participants, 1), 0);
        IF member_count = 0 THEN
            CONTINUE;
        END IF;

        new_order := ARRAY[]::uuid[];
        FOR round_num IN 0..(total_rounds - 1) LOOP
            IF round_num % 2 = 0 THEN
                FOR player_index IN 1..member_count LOOP
                    new_order := new_order || participants[player_index];
                END LOOP;
            ELSE
                FOR player_index IN REVERSE member_count..1 LOOP
                    new_order := new_order || participants[player_index];
                END LOOP;
            END IF;
        END LOOP;

        IF COALESCE(league_row.current_marketplace_turn, 0) >= COALESCE(array_length(new_order, 1), 0) THEN
            UPDATE public.leagues
            SET
                marketplace_order = new_order,
                marketplace_completed = true,
                draft_completed = true
            WHERE id = league_row.id;
        ELSE
            UPDATE public.leagues
            SET marketplace_order = new_order
            WHERE id = league_row.id;
        END IF;
    END LOOP;
END $$;
