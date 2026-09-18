-- A skipped turn was marking the next pick as "email sent" without delivering it.
-- Stop claiming from the DB trigger (pg_net often fails with the public anon JWT).
-- The skip RPC + in-app sender (and GitHub backup) send the next "your turn" mail.
-- Also set draft_started when the snake draft / marketplace is running.

DROP TRIGGER IF EXISTS trg_dispatch_marketplace_turn_emails ON public.leagues;

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
    picker_email text;
    picker_username text;
BEGIN
    is_service := auth.role() IS NOT DISTINCT FROM 'service_role';
    caller_id := auth.uid();

    IF NOT is_service THEN
        IF caller_id IS NULL AND p_league_id IS NULL THEN
            RETURN;
        END IF;
        IF caller_id IS NOT NULL AND p_league_id IS NULL THEN
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
              OR caller_id IS NULL
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
        IF picker_id IS NULL THEN
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM public.bots b WHERE b.id = picker_id) THEN
            UPDATE public.leagues
            SET marketplace_turn_email_sent_for = league_row.current_marketplace_turn
            WHERE id = league_row.id
              AND marketplace_turn_email_sent_for IS DISTINCT FROM league_row.current_marketplace_turn;
            CONTINUE;
        END IF;

        SELECT
            COALESCE(u.email, au.email),
            COALESCE(NULLIF(u.username, ''), split_part(COALESCE(u.email, au.email), '@', 1))
        INTO picker_email, picker_username
        FROM (SELECT picker_id AS id) p
        LEFT JOIN public.users u ON u.id = p.id
        LEFT JOIN auth.users au ON au.id = p.id;

        IF picker_email IS NULL THEN
            CONTINUE;
        END IF;

        UPDATE public.leagues
        SET marketplace_turn_email_sent_for = league_row.current_marketplace_turn
        WHERE id = league_row.id
          AND marketplace_turn_email_sent_for IS DISTINCT FROM league_row.current_marketplace_turn;

        GET DIAGNOSTICS claimed_count = ROW_COUNT;
        IF claimed_count = 0 THEN
            CONTINUE;
        END IF;

        league_id := league_row.id;
        league_name := league_row.name;
        turn_number := COALESCE(league_row.current_marketplace_turn, 0);
        user_id := picker_id;
        email := picker_email;
        username := picker_username;
        RETURN NEXT;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_draft_started_from_marketplace()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF COALESCE(NEW.marketplace_started, false) = true THEN
        NEW.draft_started := true;
        NEW.draft_start_time := COALESCE(NEW.draft_start_time, NEW.marketplace_start_time, NOW());
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_draft_started_from_marketplace ON public.leagues;
CREATE TRIGGER trg_sync_draft_started_from_marketplace
    BEFORE INSERT OR UPDATE OF marketplace_started, marketplace_start_time
    ON public.leagues
    FOR EACH ROW
    WHEN (COALESCE(NEW.marketplace_started, false) = true)
    EXECUTE PROCEDURE public.sync_draft_started_from_marketplace();

UPDATE public.leagues
SET draft_started = true,
    draft_start_time = COALESCE(draft_start_time, marketplace_start_time, NOW()),
    marketplace_turn_email_sent_for = NULL
WHERE id = '2f17a311-69ef-40ed-b7ad-10ce95dc0210'
  AND COALESCE(marketplace_started, false) = true;

UPDATE public.leagues
SET draft_started = true,
    draft_start_time = COALESCE(draft_start_time, marketplace_start_time, NOW())
WHERE COALESCE(marketplace_started, false) = true
  AND COALESCE(draft_started, false) = false;
