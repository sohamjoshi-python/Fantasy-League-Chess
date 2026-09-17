-- Email the current human picker once per snake-draft turn.
-- Claimed by the app immediately after a turn change, and by GitHub if nobody
-- has the league page open.

ALTER TABLE public.leagues
    ADD COLUMN IF NOT EXISTS marketplace_turn_email_sent_for integer;

CREATE OR REPLACE FUNCTION public.claim_marketplace_turn_emails(
    p_league_id uuid DEFAULT NULL
)
RETURNS TABLE (
    league_id uuid,
    league_name text,
    turn_number integer,
    user_id uuid,
    email text,
    username text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    league_row public.leagues%ROWTYPE;
    picker_id uuid;
    total_turns integer;
    claimed_count integer;
    is_service boolean;
    caller_id uuid;
BEGIN
    is_service := auth.role() IS NOT DISTINCT FROM 'service_role';
    caller_id := auth.uid();

    IF NOT is_service THEN
        IF caller_id IS NULL THEN
            RAISE EXCEPTION 'Not authenticated';
        END IF;
        IF p_league_id IS NULL THEN
            RETURN;
        END IF;
    END IF;

    FOR league_row IN
        SELECT *
        FROM public.leagues
        WHERE COALESCE(marketplace_started, false) = true
          AND COALESCE(marketplace_completed, false) = false
          AND (p_league_id IS NULL OR id = p_league_id)
          AND (
              is_service
              OR creator_id IS NOT DISTINCT FROM caller_id
              OR caller_id = ANY (COALESCE(member_ids, ARRAY[]::uuid[]))
          )
          AND COALESCE(array_length(marketplace_order, 1), 0) > 0
          AND COALESCE(current_marketplace_turn, 0) < COALESCE(array_length(marketplace_order, 1), 0)
          AND marketplace_turn_email_sent_for IS DISTINCT FROM current_marketplace_turn
        FOR UPDATE SKIP LOCKED
    LOOP
        total_turns := COALESCE(array_length(league_row.marketplace_order, 1), 0);
        IF total_turns = 0
           OR COALESCE(league_row.current_marketplace_turn, 0) >= total_turns THEN
            CONTINUE;
        END IF;

        picker_id := league_row.marketplace_order[league_row.current_marketplace_turn + 1];

        UPDATE public.leagues
        SET marketplace_turn_email_sent_for = league_row.current_marketplace_turn
        WHERE id = league_row.id
          AND marketplace_turn_email_sent_for IS DISTINCT FROM league_row.current_marketplace_turn;

        GET DIAGNOSTICS claimed_count = ROW_COUNT;
        IF claimed_count = 0 OR picker_id IS NULL THEN
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM public.bots b WHERE b.id = picker_id) THEN
            CONTINUE;
        END IF;

        RETURN QUERY
        SELECT
            league_row.id,
            league_row.name,
            COALESCE(league_row.current_marketplace_turn, 0),
            u.id,
            u.email,
            u.username
        FROM public.users u
        WHERE u.id = picker_id
          AND u.email IS NOT NULL;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_marketplace_turn_emails(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketplace_turn_emails(uuid) TO service_role;
