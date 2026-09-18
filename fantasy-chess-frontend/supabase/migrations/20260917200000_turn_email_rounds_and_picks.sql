-- Email the next picker from the database when a turn is skipped, even if they
-- never opened the app. Round-specific subject/heading plus other managers' picks.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.ordinal_label(p_n integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN COALESCE(p_n, 0) <= 0 THEN '1st'
        WHEN abs(p_n) % 100 BETWEEN 11 AND 13 THEN p_n::text || 'th'
        WHEN abs(p_n) % 10 = 1 THEN p_n::text || 'st'
        WHEN abs(p_n) % 10 = 2 THEN p_n::text || 'nd'
        WHEN abs(p_n) % 10 = 3 THEN p_n::text || 'rd'
        ELSE p_n::text || 'th'
    END;
$$;

CREATE OR REPLACE FUNCTION public.get_marketplace_turn_email_extras(
    p_league_id uuid,
    p_exclude_user_id uuid DEFAULT NULL,
    p_turn_number integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    league_row public.leagues%ROWTYPE;
    unique_managers integer := 1;
    turn_number integer := 0;
    round_number integer := 1;
    round_label text;
    timeout_label text;
    five_minute_league_ids constant uuid[] := ARRAY[
        '1465e20b-f06b-4a89-8e3f-d675759af0c4'::uuid,
        '2f17a311-69ef-40ed-b7ad-10ce95dc0210'::uuid
    ];
    rec RECORD;
    shown integer := 0;
    total_managers integer := 0;
    picks_html text := '';
    picks_text text := '';
    player_list text;
    truncated integer := 0;
    max_shown constant integer := 10;
BEGIN
    SELECT * INTO league_row
    FROM public.leagues
    WHERE id = p_league_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'round', 1,
            'roundLabel', '1st',
            'heading', 'Your 1st Round Pick',
            'timeoutLabel', '12 hours',
            'picksHtml', '',
            'picksText', ''
        );
    END IF;

    unique_managers := COALESCE((
        SELECT COUNT(DISTINCT participant_id)
        FROM unnest(COALESCE(league_row.marketplace_order, ARRAY[]::uuid[])) AS participant_id
    ), 0);
    IF unique_managers < 1 THEN
        unique_managers := GREATEST(COALESCE(array_length(league_row.member_ids, 1), 1), 1);
    END IF;

    turn_number := COALESCE(p_turn_number, league_row.current_marketplace_turn, 0);
    round_number := (turn_number / unique_managers) + 1;
    round_label := public.ordinal_label(round_number);
    timeout_label := CASE
        WHEN league_row.id = ANY (five_minute_league_ids) THEN '5 minutes'
        ELSE '12 hours'
    END;

    SELECT COUNT(*) INTO total_managers
    FROM unnest(COALESCE(league_row.member_ids, ARRAY[]::uuid[])) AS member_id
    WHERE member_id IS DISTINCT FROM p_exclude_user_id;

    FOR rec IN
        WITH managers AS (
            SELECT DISTINCT member_id
            FROM unnest(COALESCE(league_row.member_ids, ARRAY[]::uuid[])) AS member_id
            WHERE member_id IS DISTINCT FROM p_exclude_user_id
        ),
        ranked AS (
            SELECT
                m.member_id,
                COALESCE(
                    NULLIF(u.username, ''),
                    b.name,
                    split_part(COALESCE(u.email, au.email), '@', 1),
                    'Manager'
                ) AS manager_name,
                COALESCE(array_length(t.player_ids, 1), 0) AS pick_count,
                COALESCE((
                    SELECT SUM(cp.elo)
                    FROM unnest(COALESCE(t.player_ids, '{}')) AS pid
                    JOIN public.chess_players cp ON cp.id::text = pid::text
                ), 0) AS elo_sum,
                COALESCE((
                    SELECT string_agg(cp.name, ', ' ORDER BY ord)
                    FROM unnest(COALESCE(t.player_ids, '{}')) WITH ORDINALITY AS x(pid, ord)
                    JOIN public.chess_players cp ON cp.id::text = pid::text
                ), '') AS player_names
            FROM managers m
            LEFT JOIN public.teams t
                ON t.league_id = p_league_id
               AND (t.user_id = m.member_id OR t.bot_id = m.member_id)
            LEFT JOIN public.users u ON u.id = m.member_id
            LEFT JOIN auth.users au ON au.id = m.member_id
            LEFT JOIN public.bots b ON b.id = m.member_id
        )
        SELECT manager_name, pick_count, player_names
        FROM ranked
        ORDER BY elo_sum DESC, pick_count DESC, manager_name
        LIMIT max_shown
    LOOP
        shown := shown + 1;
        player_list := rec.player_names;
        IF rec.pick_count = 0 OR player_list = '' THEN
            player_list := 'hasn''t picked yet';
        END IF;

        picks_html := picks_html || format(
            '<p style="margin: 0 0 10px;"><strong>%s</strong> — %s</p>',
            replace(replace(replace(rec.manager_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
            replace(replace(replace(player_list, '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
        );
        picks_text := picks_text || rec.manager_name || ': ' || player_list || E'\n';
    END LOOP;

    truncated := GREATEST(total_managers - shown, 0);
    IF truncated > 0 THEN
        picks_html := picks_html || format(
            '<p style="margin: 12px 0 0; color: #777777; font-size: 13px;">…and %s more manager%s</p>',
            truncated,
            CASE WHEN truncated = 1 THEN '' ELSE 's' END
        );
        picks_text := picks_text || format('...and %s more manager%s', truncated, CASE WHEN truncated = 1 THEN '' ELSE 's' END);
    END IF;

    RETURN jsonb_build_object(
        'round', round_number,
        'roundLabel', round_label,
        'heading', 'Your ' || round_label || ' Round Pick',
        'timeoutLabel', timeout_label,
        'picksHtml', picks_html,
        'picksText', picks_text
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_marketplace_turn_email_extras(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_marketplace_turn_email_extras(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_turn_email_extras(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ordinal_label(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ordinal_label(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.dispatch_marketplace_turn_emails(p_league_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE
    recipient RECORD;
    extras jsonb;
    recipient_name text;
    league_name text;
    league_url text;
    timeout_label text;
    heading text;
    picks_html text;
    picks_text text;
    subject text;
    html_content text;
    text_content text;
    anon_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.0PT7ZAC8wGjVEw4Tv_1Oob9BfxPOtzTXmPKfwX7qdJA';
    functions_url constant text := 'https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/send-resend-email';
BEGIN
    IF p_league_id IS NULL THEN
        RETURN;
    END IF;

    FOR recipient IN
        SELECT *
        FROM public.claim_marketplace_turn_emails(p_league_id)
    LOOP
        extras := COALESCE(
            public.get_marketplace_turn_email_extras(recipient.league_id, recipient.user_id, recipient.turn_number),
            '{}'::jsonb
        );
        recipient_name := COALESCE(NULLIF(recipient.username, ''), split_part(recipient.email, '@', 1), 'there');
        league_name := COALESCE(recipient.league_name, 'your league');
        league_url := 'https://fantasyleaguechess.com/league/' || recipient.league_id::text;
        timeout_label := COALESCE(NULLIF(extras->>'timeoutLabel', ''), '12 hours');
        heading := COALESCE(NULLIF(extras->>'heading', ''), 'Your Turn To Draft');
        picks_html := COALESCE(extras->>'picksHtml', '');
        picks_text := COALESCE(extras->>'picksText', '');
        subject := heading || ' in ' || league_name;
        text_content := format(
            E'Hi %s,\n\n%s in the draft for %s.\n\nYou have %s to buy a player. If you don''t pick, this turn is skipped and you can still add players later in the regular marketplace.\n',
            recipient_name,
            heading,
            league_name,
            timeout_label
        );
        IF picks_text <> '' THEN
            text_content := text_content || E'\nPicks so far:\n' || picks_text || E'\n';
        END IF;
        text_content := text_content || E'\nMake your pick: ' || league_url;

        html_content := format(
            $html$
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="https://fantasyleaguechess.com/assets/fantasy-league-chess-logo-updated.png" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">%s</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi %s,</p>
            <p style="margin: 0 0 18px;">It's time for your pick in <strong>%s</strong>.</p>
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0;"><strong>You have %s</strong> to buy a player. If you don't pick, this turn is skipped.</p>
            </div>
            %s
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
            replace(replace(replace(heading, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
            replace(replace(replace(recipient_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
            replace(replace(replace(league_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
            timeout_label,
            CASE
                WHEN picks_html = '' THEN ''
                ELSE '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 0 0 22px;"><p style="margin: 0 0 12px; font-weight: bold;">Picks so far</p>' || picks_html || '</div>'
            END,
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
                        'turnNumber', recipient.turn_number,
                        'roundLabel', extras->>'roundLabel'
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

GRANT EXECUTE ON FUNCTION public.dispatch_marketplace_turn_emails(uuid) TO service_role;

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
        PERFORM cron.schedule(
            'skip-expired-marketplace-turns',
            '*/2 * * * *',
            $cron$SELECT public.skip_expired_marketplace_turns(12, NULL);$cron$
        );
        PERFORM cron.schedule(
            'dispatch-marketplace-turn-emails',
            '*/2 * * * *',
            $cron$SELECT public.dispatch_marketplace_turn_emails(id)
                  FROM public.leagues
                  WHERE COALESCE(marketplace_started, false) = true
                    AND COALESCE(marketplace_completed, false) = false
                    AND marketplace_turn_email_sent_for IS DISTINCT FROM current_marketplace_turn;$cron$
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule marketplace email cron: %', SQLERRM;
END $$;

