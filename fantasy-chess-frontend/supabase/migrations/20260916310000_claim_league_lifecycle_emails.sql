-- Claim marketplace/league-start emails from the app using the already-deployed
-- send-resend-email function. Avoids calling a not-yet-deployed Edge Function.

CREATE OR REPLACE FUNCTION public.claim_league_lifecycle_emails(
    p_event text,
    p_league_id uuid
)
RETURNS TABLE (
    league_id uuid,
    league_name text,
    start_date date,
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
    pt_today date;
    updated_count integer := 0;
BEGIN
    IF p_event IS NULL OR p_event NOT IN ('marketplace_started', 'league_started') THEN
        RAISE EXCEPTION 'Invalid lifecycle event';
    END IF;

    IF p_league_id IS NULL THEN
        RETURN;
    END IF;

    SELECT * INTO league_row
    FROM public.leagues
    WHERE id = p_league_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Not authenticated';
        END IF;
        IF league_row.creator_id IS DISTINCT FROM auth.uid()
           AND NOT (auth.uid() = ANY (COALESCE(league_row.member_ids, ARRAY[]::uuid[]))) THEN
            RETURN;
        END IF;
    END IF;

    pt_today := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;

    IF p_event = 'marketplace_started' THEN
        IF COALESCE(league_row.marketplace_started, false) = false THEN
            RETURN;
        END IF;

        UPDATE public.leagues
        SET marketplace_started_email_sent_at = NOW()
        WHERE id = p_league_id
          AND marketplace_started_email_sent_at IS NULL;

        GET DIAGNOSTICS updated_count = ROW_COUNT;
    ELSE
        IF league_row.start_date IS NULL OR league_row.start_date > pt_today THEN
            RETURN;
        END IF;

        UPDATE public.leagues
        SET league_started_email_sent_at = NOW()
        WHERE id = p_league_id
          AND league_started_email_sent_at IS NULL;

        GET DIAGNOSTICS updated_count = ROW_COUNT;
    END IF;

    IF updated_count = 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        league_row.id,
        league_row.name,
        league_row.start_date,
        u.id,
        u.email,
        u.username
    FROM public.users u
    WHERE u.id = ANY (COALESCE(league_row.member_ids, ARRAY[]::uuid[]))
      AND u.email IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.bots b
          WHERE b.id = u.id
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_league_lifecycle_emails(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_league_lifecycle_emails(text, uuid) TO service_role;
