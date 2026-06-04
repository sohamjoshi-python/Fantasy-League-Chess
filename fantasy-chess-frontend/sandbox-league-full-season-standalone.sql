-- =============================================================================
-- SANDBOX LEAGUE — FULL SEASON BACKTEST (single file, zero manual steps)
--
-- What this simulates (matches production flow):
--   1. chess_players  — REAL rows already in your DB (from TT / PGN imports)
--   2. games          — SIMULATED Titled Tuesday results (round = SANDBOX) for
--                       past Tuesdays where real games are not imported yet
--   3. leagues/teams  — fictional *managers* (3 sandbox bots), each rostering
--                       real GMs; a real user is league owner only (commissioner)
--   4. lineups        — week_start_date = Monday before each Tuesday
--   5. process_weekly_results — rolls game points into lineups.total_points
--
-- Prerequisite:
--   - At least one row in public.users (sign up once in the app)
--   - At least 30 rows in public.chess_players (run titled_tuesday.py / pgn import)
--
-- Safe to re-run: deletes prior sandbox league + games tagged round SANDBOX.
-- Does NOT insert or delete chess_players.
--
-- After run: open the app → join code SANDBOX → "FC Sandbox Backtest League"
-- Note: the app UI currently shows one bot in standings (maybeSingle); all three
-- bots are scored correctly in the DB (see verification queries below).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Scoring function (Monday lineups ↔ Tuesday games YYYY.MM.DD)
--     Scores every bot in the league (not only the first).
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.process_weekly_results(DATE);

CREATE OR REPLACE FUNCTION public.process_weekly_results(week_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    league_record RECORD;
    member_id UUID;
    lineup_record RECORD;
    team RECORD;
    bot_record RECORD;
    auto_lineup_players UUID[];
    player_ids UUID[];
    calculated_points NUMERIC(10, 2);
    game_date_dotted TEXT;
    lineup_week_start DATE;
BEGIN
    IF week_date IS NULL THEN
        RAISE EXCEPTION 'week_date (Titled Tuesday) is required';
    END IF;

    game_date_dotted := to_char(week_date, 'YYYY.MM.DD');
    lineup_week_start := week_date - INTERVAL '1 day';

    FOR league_record IN
        SELECT * FROM public.leagues
        WHERE start_date <= week_date AND end_date >= week_date
    LOOP
        FOREACH member_id IN ARRAY league_record.member_ids
        LOOP
            SELECT * INTO lineup_record
            FROM public.lineups
            WHERE user_id = member_id
              AND league_id = league_record.id
              AND week_start_date = lineup_week_start;

            IF lineup_record IS NULL THEN
                SELECT * INTO team
                FROM public.teams
                WHERE user_id = member_id AND league_id = league_record.id;

                IF team.player_ids IS NOT NULL AND array_length(team.player_ids, 1) >= 5 THEN
                    auto_lineup_players := ARRAY(
                        SELECT cp.id FROM public.chess_players cp
                        WHERE cp.id = ANY(team.player_ids)
                        ORDER BY CASE WHEN cp.accuracy IS NULL THEN 1 ELSE 0 END, cp.accuracy ASC NULLS LAST
                        LIMIT 5
                    );
                    INSERT INTO public.lineups (user_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
                    VALUES (member_id, league_record.id, lineup_week_start, auto_lineup_players, 0, NOW(), NOW());
                    SELECT * INTO lineup_record FROM public.lineups
                    WHERE user_id = member_id AND league_id = league_record.id AND week_start_date = lineup_week_start;
                END IF;
            END IF;

            IF lineup_record IS NOT NULL THEN
                player_ids := lineup_record.player_ids;
                WITH lineup_players AS (SELECT unnest(player_ids) AS player_id),
                player_names_cte AS (
                    SELECT lp.player_id, cp.name FROM lineup_players lp
                    JOIN public.chess_players cp ON cp.id = lp.player_id
                ),
                player_points AS (
                    SELECT COALESCE(SUM(
                        CASE WHEN lower(g.white) = lower(pn.name) THEN g.white_points
                             WHEN lower(g.black) = lower(pn.name) THEN g.black_points ELSE 0 END
                    ), 0) AS player_total_points
                    FROM player_names_cte pn
                    LEFT JOIN public.games g ON g.date = game_date_dotted
                        AND (lower(g.white) = lower(pn.name) OR lower(g.black) = lower(pn.name))
                )
                SELECT SUM(player_total_points) INTO calculated_points FROM player_points;
                UPDATE public.lineups SET total_points = calculated_points, updated_at = NOW() WHERE id = lineup_record.id;
            END IF;
        END LOOP;

        FOR bot_record IN
            SELECT * FROM public.bots WHERE league_id = league_record.id
        LOOP
            SELECT * INTO lineup_record FROM public.lineups
            WHERE bot_id = bot_record.id AND league_id = league_record.id AND week_start_date = lineup_week_start;

            IF lineup_record IS NULL THEN
                SELECT * INTO team FROM public.teams WHERE bot_id = bot_record.id AND league_id = league_record.id;
                IF team.player_ids IS NOT NULL AND array_length(team.player_ids, 1) >= 5 THEN
                    auto_lineup_players := ARRAY(
                        SELECT cp.id FROM public.chess_players cp
                        WHERE cp.id = ANY(team.player_ids)
                        ORDER BY CASE WHEN cp.accuracy IS NULL THEN 0 ELSE 1 END, cp.accuracy DESC NULLS LAST
                        LIMIT 5
                    );
                    INSERT INTO public.lineups (bot_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
                    VALUES (bot_record.id, league_record.id, lineup_week_start, auto_lineup_players, 0, NOW(), NOW());
                    SELECT * INTO lineup_record FROM public.lineups
                    WHERE bot_id = bot_record.id AND league_id = league_record.id AND week_start_date = lineup_week_start;
                END IF;
            END IF;

            IF lineup_record IS NOT NULL THEN
                player_ids := lineup_record.player_ids;
                WITH lineup_players AS (SELECT unnest(player_ids) AS player_id),
                player_names_cte AS (
                    SELECT lp.player_id, cp.name FROM lineup_players lp
                    JOIN public.chess_players cp ON cp.id = lp.player_id
                ),
                player_points AS (
                    SELECT COALESCE(SUM(
                        CASE WHEN lower(g.white) = lower(pn.name) THEN g.white_points
                             WHEN lower(g.black) = lower(pn.name) THEN g.black_points ELSE 0 END
                    ), 0) AS player_total_points
                    FROM player_names_cte pn
                    LEFT JOIN public.games g ON g.date = game_date_dotted
                        AND (lower(g.white) = lower(pn.name) OR lower(g.black) = lower(pn.name))
                )
                SELECT SUM(player_total_points) INTO calculated_points FROM player_points;
                UPDATE public.lineups SET total_points = calculated_points, updated_at = NOW() WHERE id = lineup_record.id;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_weekly_results(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_weekly_results(DATE) TO service_role;

-- -----------------------------------------------------------------------------
-- B) Build sandbox season (real GMs → simulated games → fictional managers)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_league_id       uuid := 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
    v_bot_ids         uuid[] := ARRAY[
        'aaaaaaaa-bbbb-cccc-dddd-000000000017'::uuid,
        'aaaaaaaa-bbbb-cccc-dddd-000000000018'::uuid,
        'aaaaaaaa-bbbb-cccc-dddd-000000000019'::uuid
    ];
    v_bot_names       text[] := ARRAY['Sandbox Alex', 'Sandbox Blake', 'Sandbox Casey'];
    v_creator_id      uuid;
    v_season_end        date;
    v_season_start      date;
    v_tuesday           date;
    v_monday            date;
    v_game_date         text;
    v_player_ids        uuid[];
    v_bot_teams         uuid[][];
    v_week_num          int := 0;
    v_i                 int;
    v_b                 int;
    v_w                 int;
    v_white             text;
    v_black             text;
    v_wp                numeric;
    v_bp                numeric;
    v_result            text;
    v_lineup            uuid[];
    v_all_names         text[];
    v_pool_size         int := 30;
    v_roster_size       int := 10;
BEGIN
    -- Commissioner only (not a competing manager)
    SELECT id INTO v_creator_id FROM public.users ORDER BY created_at LIMIT 1;
    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'No users found. Sign up once in the app, then re-run this script.';
    END IF;

    SELECT coalesce(array_agg(id ORDER BY elo DESC NULLS LAST, name), ARRAY[]::uuid[])
    INTO v_player_ids
    FROM (
        SELECT id, name, elo
        FROM public.chess_players
        ORDER BY elo DESC NULLS LAST, name
        LIMIT v_pool_size
    ) top_players;

    IF coalesce(array_length(v_player_ids, 1), 0) < v_pool_size THEN
        RAISE EXCEPTION 'Need at least % chess_players in the database (have %). Import Titled Tuesday / PGN data first.',
            v_pool_size, coalesce(array_length(v_player_ids, 1), 0);
    END IF;

    SELECT array_agg(name ORDER BY elo DESC NULLS LAST, name)
    INTO v_all_names
    FROM public.chess_players
    WHERE id = ANY(v_player_ids);

    -- Season window: last 4 Titled Tuesdays ending ~1 month ago (not current week)
    SELECT max(d::date) INTO v_season_end
    FROM generate_series(current_date - 42, current_date - 7, interval '1 day') d
    WHERE EXTRACT(DOW FROM d) = 2;

    IF v_season_end IS NULL THEN
        v_season_end := (current_date - interval '28 days')::date;
        WHILE EXTRACT(DOW FROM v_season_end) <> 2 LOOP
            v_season_end := v_season_end - 1;
        END LOOP;
    END IF;

    v_season_start := v_season_end - 21;
    WHILE EXTRACT(DOW FROM v_season_start) <> 2 LOOP
        v_season_start := v_season_start + 1;
    END LOOP;

    RAISE NOTICE 'Sandbox season: % to % | % real GMs in game pool', v_season_start, v_season_end, v_pool_size;

    -- Cleanup previous sandbox run (league artifacts + tagged games only)
    DELETE FROM public.lineups WHERE league_id = v_league_id;
    DELETE FROM public.league_coin_balances WHERE league_id = v_league_id;
    DELETE FROM public.teams WHERE league_id = v_league_id;
    DELETE FROM public.bots WHERE league_id = v_league_id;
    DELETE FROM public.leagues WHERE id = v_league_id;
    DELETE FROM public.games WHERE round LIKE 'SANDBOX%';

    -- Three fictional managers, each with 10 real GMs
    v_bot_teams := ARRAY[
        v_player_ids[1:v_roster_size],
        v_player_ids[(v_roster_size + 1):(2 * v_roster_size)],
        v_player_ids[(2 * v_roster_size + 1):v_pool_size]
    ];

    INSERT INTO public.leagues (
        id, name, description, is_public, buy_in,
        start_date, end_date, join_code, creator_id,
        member_ids, draft_completed, current_draft_turn
    ) VALUES (
        v_league_id,
        'FC Sandbox Backtest League',
        'Backtest with real chess_players and simulated TT games. Fictional managers: Alex, Blake, Casey. Join: SANDBOX.',
        false,
        0,
        v_season_start,
        v_season_end,
        'SANDBOX',
        v_creator_id,
        ARRAY[v_creator_id],
        true,
        0
    );

    BEGIN
        UPDATE public.leagues SET marketplace_started = true WHERE id = v_league_id;
    EXCEPTION WHEN undefined_column THEN
        NULL;
    END;

    FOR v_i IN 1..3 LOOP
        INSERT INTO public.bots (id, league_id, name)
        VALUES (v_bot_ids[v_i], v_league_id, v_bot_names[v_i]);

        INSERT INTO public.teams (bot_id, league_id, player_ids)
        VALUES (v_bot_ids[v_i], v_league_id, v_bot_teams[v_i]);
    END LOOP;

    BEGIN
        FOR v_i IN 1..3 LOOP
            INSERT INTO public.league_coin_balances (bot_id, league_id, coin_balance)
            VALUES (v_bot_ids[v_i], v_league_id, 50);
        END LOOP;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    -- Each Tuesday: simulated games among real GM names, then lineups + score
    v_tuesday := v_season_start;
    WHILE v_tuesday <= v_season_end LOOP
        IF EXTRACT(DOW FROM v_tuesday) = 2 THEN
            v_week_num := v_week_num + 1;
            v_monday := v_tuesday - 1;
            v_game_date := to_char(v_tuesday, 'YYYY.MM.DD');

            RAISE NOTICE 'Week %: Monday % / Tuesday % / games.date %',
                v_week_num, v_monday, v_tuesday, v_game_date;

            FOR v_i IN 1..24 LOOP
                v_w := 1 + floor(random() * array_length(v_all_names, 1))::int;
                v_b := 1 + floor(random() * array_length(v_all_names, 1))::int;
                WHILE v_b = v_w LOOP
                    v_b := 1 + floor(random() * array_length(v_all_names, 1))::int;
                END LOOP;
                v_white := v_all_names[v_w];
                v_black := v_all_names[v_b];
                v_wp := round((random() * 4 + 0.5)::numeric, 2);
                v_bp := round((random() * 4 + 0.5)::numeric, 2);
                IF random() < 0.45 THEN v_result := '1-0';
                ELSIF random() < 0.9 THEN v_result := '0-1';
                ELSE v_result := '1/2-1/2';
                END IF;

                INSERT INTO public.games (
                    early_late, date, white, black, result,
                    white_accuracy, black_accuracy, round,
                    white_points, black_points
                ) VALUES (
                    CASE WHEN random() < 0.5 THEN 'early' ELSE 'late' END,
                    v_game_date, v_white, v_black, v_result,
                    70 + floor(random() * 25)::int,
                    70 + floor(random() * 25)::int,
                    'SANDBOX-' || v_week_num || '-' || v_i,
                    v_wp, v_bp
                );
            END LOOP;

            DELETE FROM public.lineups
            WHERE league_id = v_league_id AND week_start_date = v_monday;

            FOR v_b IN 1..3 LOOP
                v_lineup := ARRAY[]::uuid[];
                FOR v_i IN 0..4 LOOP
                    v_lineup := array_append(v_lineup,
                        v_bot_teams[v_b][1 + ((v_week_num - 1 + v_i) % v_roster_size)]);
                END LOOP;
                INSERT INTO public.lineups (bot_id, league_id, week_start_date, player_ids, total_points)
                VALUES (v_bot_ids[v_b], v_league_id, v_monday, v_lineup, 0);
            END LOOP;

            PERFORM public.process_weekly_results(v_tuesday);
        END IF;
        v_tuesday := v_tuesday + 1;
    END LOOP;

    RAISE NOTICE 'Sandbox complete. Join code: SANDBOX | League id: %', v_league_id;
    RAISE NOTICE 'Managers: %, %, % (bots). Games tagged round SANDBOX-*.', v_bot_names[1], v_bot_names[2], v_bot_names[3];
END $$;

-- -----------------------------------------------------------------------------
-- C) Verification (read-only) — expect PASS and non-zero points
-- -----------------------------------------------------------------------------
SELECT 'League' AS section, id, name, join_code, start_date, end_date, draft_completed
FROM public.leagues
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';

SELECT 'Roster sample (real GMs)' AS section, b.name AS manager, cp.name AS gm, cp.elo
FROM public.bots b
JOIN public.teams t ON t.bot_id = b.id AND t.league_id = b.league_id
CROSS JOIN LATERAL unnest(t.player_ids) pid
JOIN public.chess_players cp ON cp.id = pid
WHERE b.league_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001'
ORDER BY b.name, cp.name
LIMIT 15;

SELECT 'Simulated games per Tuesday' AS section, date, count(*) AS game_count
FROM public.games
WHERE round LIKE 'SANDBOX%'
GROUP BY date
ORDER BY date;

SELECT 'Lineups scored' AS section,
    week_start_date,
    COALESCE(u.username, b.name) AS member,
    total_points,
    (SELECT array_agg(cp.name ORDER BY cp.name)
     FROM public.chess_players cp WHERE cp.id = ANY(l.player_ids)) AS lineup_gms
FROM public.lineups l
LEFT JOIN public.users u ON u.id = l.user_id
LEFT JOIN public.bots b ON b.id = l.bot_id
WHERE l.league_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001'
ORDER BY week_start_date, member;

SELECT 'Season standings (DB)' AS section,
    COALESCE(u.username, b.name || ' (manager)') AS member,
    round(sum(l.total_points)::numeric, 2) AS season_points
FROM public.lineups l
LEFT JOIN public.users u ON u.id = l.user_id
LEFT JOIN public.bots b ON b.id = l.bot_id
WHERE l.league_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001'
GROUP BY 1
ORDER BY season_points DESC;

WITH weeks AS (
    SELECT DISTINCT (week_start_date + 1) AS tournament_date, week_start_date
    FROM public.lineups
    WHERE league_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001'
),
check AS (
    SELECT
        w.week_start_date,
        l.total_points AS stored,
        COALESCE((
            SELECT round(sum(
                CASE WHEN lower(g.white) = lower(cp.name) THEN g.white_points
                     WHEN lower(g.black) = lower(cp.name) THEN g.black_points ELSE 0 END
            )::numeric, 2)
            FROM unnest(l.player_ids) pid
            JOIN public.chess_players cp ON cp.id = pid
            LEFT JOIN public.games g ON g.date = to_char(w.tournament_date, 'YYYY.MM.DD')
                AND (lower(g.white) = lower(cp.name) OR lower(g.black) = lower(cp.name))
        ), 0) AS expected
    FROM weeks w
    JOIN public.lineups l ON l.league_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001'
        AND l.week_start_date = w.week_start_date
)
SELECT
    week_start_date,
    count(*) AS lineups,
    count(*) FILTER (WHERE stored IS DISTINCT FROM expected) AS mismatches,
    CASE WHEN count(*) FILTER (WHERE stored IS DISTINCT FROM expected) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM check
GROUP BY week_start_date
ORDER BY week_start_date;
