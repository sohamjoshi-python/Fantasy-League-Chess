-- PL/pgSQL variable marketplace_order collided with leagues.marketplace_order
-- in the UPDATE, raising 42702 column reference is ambiguous.

CREATE OR REPLACE FUNCTION public.start_marketplace(p_league_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    league_record RECORD;
    ordered_members UUID[];
    marketplace_order_var UUID[];
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

    marketplace_order_var := ARRAY[]::uuid[];

    FOR round_num IN 0..(total_rounds - 1) LOOP
        IF round_num % 2 = 0 THEN
            FOR player_index IN 1..member_count LOOP
                marketplace_order_var := marketplace_order_var || ordered_members[player_index];
            END LOOP;
        ELSE
            FOR player_index IN REVERSE member_count..1 LOOP
                marketplace_order_var := marketplace_order_var || ordered_members[player_index];
            END LOOP;
        END IF;
    END LOOP;

    UPDATE public.leagues
    SET
        marketplace_started = true,
        marketplace_start_time = NOW(),
        marketplace_order = marketplace_order_var,
        current_marketplace_turn = 0,
        marketplace_completed = false,
        marketplace_turn_started_at = NOW()
    WHERE id = p_league_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_marketplace(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_marketplace(UUID) TO service_role;
