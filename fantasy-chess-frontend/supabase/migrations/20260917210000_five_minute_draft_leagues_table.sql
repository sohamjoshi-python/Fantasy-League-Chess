-- Single list of leagues that use a 5-minute snake-draft pick clock.
--
-- Add:
--   INSERT INTO public.five_minute_draft_leagues (league_id)
--   VALUES ('your-league-uuid');
--
-- Remove:
--   DELETE FROM public.five_minute_draft_leagues
--   WHERE league_id = 'your-league-uuid';

CREATE TABLE IF NOT EXISTS public.five_minute_draft_leagues (
    league_id uuid PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.five_minute_draft_leagues IS
    'Leagues with a 5-minute snake-draft pick clock. Insert a league id to enable; delete the row to go back to 12 hours.';

ALTER TABLE public.five_minute_draft_leagues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS five_minute_draft_leagues_select ON public.five_minute_draft_leagues;
CREATE POLICY five_minute_draft_leagues_select
    ON public.five_minute_draft_leagues
    FOR SELECT
    TO authenticated
    USING (true);

GRANT SELECT ON public.five_minute_draft_leagues TO authenticated;
GRANT SELECT ON public.five_minute_draft_leagues TO service_role;

INSERT INTO public.five_minute_draft_leagues (league_id)
VALUES
    ('1465e20b-f06b-4a89-8e3f-d675759af0c4'),
    ('2f17a311-69ef-40ed-b7ad-10ce95dc0210'),
    ('a354e52c-9c02-4c44-9c52-a5e3aa751c0d')
ON CONFLICT (league_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_five_minute_draft_league(p_league_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.five_minute_draft_leagues
        WHERE league_id = p_league_id
    );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_turn_timeout_label(p_league_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN public.is_five_minute_draft_league(p_league_id) THEN '5 minutes'
        ELSE '12 hours'
    END;
$$;

GRANT EXECUTE ON FUNCTION public.is_five_minute_draft_league(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_five_minute_draft_league(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketplace_turn_timeout_label(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_turn_timeout_label(uuid) TO service_role;

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
                        WHEN public.is_five_minute_draft_league(id) THEN interval '5 minutes'
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

        IF public.is_five_minute_draft_league(league_row.id) THEN
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
    timeout_label := public.marketplace_turn_timeout_label(league_row.id);

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

-- Give this league a fresh 5-minute clock on the current pick.
UPDATE public.leagues
SET marketplace_turn_started_at = NOW()
WHERE id = 'a354e52c-9c02-4c44-9c52-a5e3aa751c0d'
  AND COALESCE(marketplace_started, false) = true
  AND COALESCE(marketplace_completed, false) = false;

GRANT EXECUTE ON FUNCTION public.skip_expired_marketplace_turns(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_expired_marketplace_turns(numeric, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_marketplace_turn_email_extras(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_turn_email_extras(uuid, uuid, integer) TO service_role;
