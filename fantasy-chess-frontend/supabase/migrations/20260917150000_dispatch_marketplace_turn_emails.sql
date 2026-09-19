-- Send "your turn" emails from the database when the pick changes, even if
-- nobody has the league page open. Uses the already-deployed send-resend-email
-- function via pg_net after the turn advances.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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

CREATE OR REPLACE FUNCTION public.dispatch_marketplace_turn_emails(p_league_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE
    recipient RECORD;
    recipient_name text;
    league_name text;
    league_url text;
    timeout_label text;
    subject text;
    html_content text;
    text_content text;
    anon_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.0PT7ZAC8wGjVEw4Tv_1Oob9BfxPOtzTXmPKfwX7qdJA';
    functions_url constant text := 'https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/send-resend-email';
    test_league_id constant uuid := '1465e20b-f06b-4a89-8e3f-d675759af0c4';
BEGIN
    IF p_league_id IS NULL THEN
        RETURN;
    END IF;

    FOR recipient IN
        SELECT *
        FROM public.claim_marketplace_turn_emails(p_league_id)
    LOOP
        recipient_name := COALESCE(NULLIF(recipient.username, ''), split_part(recipient.email, '@', 1), 'there');
        league_name := COALESCE(recipient.league_name, 'your league');
        league_url := 'https://fantasyleaguechess.com/league/' || recipient.league_id::text;
        timeout_label := CASE
            WHEN recipient.league_id = test_league_id THEN '5 minutes'
            ELSE '12 hours'
        END;
        subject := 'Your turn to draft in ' || league_name;
        text_content := format(
            E'Hi %s,\n\nIt''s your turn to pick in the draft for %s.\n\nYou have %s to buy a player. If you don''t pick, this turn is skipped and you can still add players later in the regular marketplace.\n\nMake your pick: %s',
            recipient_name,
            league_name,
            timeout_label,
            league_url
        );
        html_content := format(
            $html$
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="https://fantasyleaguechess.com/assets/fantasy-league-chess-logo-updated.png" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Your Turn To Draft</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi %s,</p>
            <p style="margin: 0 0 18px;">It's your turn to pick in the draft for <strong>%s</strong>.</p>
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0;"><strong>You have %s</strong> to buy a player. If you don't pick, this turn is skipped.</p>
            </div>
            <p style="margin: 0 0 24px;">You can still add players later in the regular marketplace after the snake draft ends.</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="%s" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Make Your Pick</a>
            </p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #777777; padding: 0 24px 24px;">
            <p style="margin: 0;">&copy; 2026 Fantasy League Chess. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
            $html$,
            replace(replace(replace(recipient_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
            replace(replace(replace(league_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
            timeout_label,
            league_url
        );

        BEGIN
            PERFORM net.http_post(
                url := functions_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || anon_key,
                    'apikey', anon_key
                ),
                body := jsonb_build_object(
                    'to', recipient.email,
                    'subject', subject,
                    'htmlContent', html_content,
                    'textContent', text_content,
                    'emailType', 'custom',
                    'userId', recipient.user_id,
                    'leagueId', recipient.league_id,
                    'metadata', jsonb_build_object(
                        'source', 'db_turn_trigger',
                        'turnNumber', recipient.turn_number
                    )
                ),
                timeout_milliseconds := 10000
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to dispatch marketplace turn email: %', SQLERRM;
        END;
    END LOOP;
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

DROP TRIGGER IF EXISTS trg_dispatch_marketplace_turn_emails ON public.leagues;
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

REVOKE ALL ON FUNCTION public.claim_marketplace_turn_emails(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_marketplace_turn_emails(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_marketplace_turn_emails(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketplace_turn_emails(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_marketplace_turn_emails(uuid) TO service_role;

-- Email whoever is currently up in an active draft if that turn has not been
-- claimed yet. After this, later turns send from the trigger with no one in the app.
SELECT public.dispatch_marketplace_turn_emails(id)
FROM public.leagues
WHERE COALESCE(marketplace_started, false) = true
  AND COALESCE(marketplace_completed, false) = false
  AND marketplace_turn_email_sent_for IS DISTINCT FROM current_marketplace_turn;
