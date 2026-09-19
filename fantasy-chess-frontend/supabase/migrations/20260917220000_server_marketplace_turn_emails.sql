-- Turn emails were only arriving if someone had the league page open.
-- The AFTER UPDATE trigger claimed marketplace_turn_email_sent_for, then pg_net
-- called send-resend-email with a dummy anon JWT. JWT check failed, so the mail
-- never sent and GitHub/the app had nothing left to claim.
--
-- This migration:
-- 1. Stops claiming inside the database.
-- 2. Asks the process-marketplace-turns Edge Function to skip + send.
-- 3. Reopens any current turns that were marked sent without a real email.

DROP TRIGGER IF EXISTS trg_dispatch_marketplace_turn_emails ON public.leagues;

CREATE OR REPLACE FUNCTION public.dispatch_marketplace_turn_emails(p_league_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
BEGIN
    -- Do not claim here. Claiming without a successful send eats the one-shot flag.
    PERFORM net.http_post(
        url := 'https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/process-marketplace-turns',
        headers := jsonb_build_object(
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'leagueId', p_league_id
        ),
        timeout_milliseconds := 10000
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to invoke process-marketplace-turns: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_marketplace_turn_emails_from_league()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.dispatch_marketplace_turn_emails(NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dispatch_marketplace_turn_emails
    AFTER UPDATE ON public.leagues
    FOR EACH ROW
    WHEN (
        COALESCE(NEW.marketplace_started, false) = true
        AND COALESCE(NEW.marketplace_completed, false) = false
        AND (
            NEW.current_marketplace_turn IS DISTINCT FROM OLD.current_marketplace_turn
            OR COALESCE(NEW.marketplace_started, false) IS DISTINCT FROM COALESCE(OLD.marketplace_started, false)
        )
    )
    EXECUTE PROCEDURE public.dispatch_marketplace_turn_emails_from_league();

GRANT EXECUTE ON FUNCTION public.dispatch_marketplace_turn_emails(uuid) TO service_role;

-- Re-open claims that were marked sent even though Resend never got them.
DO $$
BEGIN
    UPDATE public.leagues l
    SET marketplace_turn_email_sent_for = NULL
    WHERE COALESCE(l.marketplace_started, false) = true
      AND COALESCE(l.marketplace_completed, false) = false
      AND l.marketplace_turn_email_sent_for IS NOT DISTINCT FROM l.current_marketplace_turn
      AND NOT EXISTS (
          SELECT 1
          FROM public.emails e
          WHERE e.league_id = l.id
            AND COALESCE(e.metadata->>'turnNumber', '') = l.current_marketplace_turn::text
            AND COALESCE(e.metadata->>'source', '') IN (
                'marketplace_turn',
                'github_marketplace_turn',
                'db_turn_trigger',
                'process_marketplace_turns'
            )
      );
EXCEPTION WHEN undefined_table THEN
    UPDATE public.leagues
    SET marketplace_turn_email_sent_for = NULL
    WHERE COALESCE(marketplace_started, false) = true
      AND COALESCE(marketplace_completed, false) = false
      AND marketplace_turn_email_sent_for IS NOT DISTINCT FROM current_marketplace_turn;
END $$;

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron is not available on this database';
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('skip-expired-marketplace-turns');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        BEGIN
            PERFORM cron.unschedule('dispatch-marketplace-turn-emails');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        BEGIN
            PERFORM cron.unschedule('process-marketplace-turns');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Skip even if the Edge Function is not deployed yet.
        PERFORM cron.schedule(
            'skip-expired-marketplace-turns',
            '* * * * *',
            $cron$SELECT public.skip_expired_marketplace_turns(12, NULL);$cron$
        );

        -- Skip + send via the Edge Function. verify_jwt is off for this function.
        PERFORM cron.schedule(
            'process-marketplace-turns',
            '* * * * *',
            $cron$SELECT net.http_post(
                url := 'https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/process-marketplace-turns',
                headers := '{"Content-Type": "application/json"}'::jsonb,
                body := '{}'::jsonb,
                timeout_milliseconds := 15000
            );$cron$
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule marketplace turn processing: %', SQLERRM;
END $$;
