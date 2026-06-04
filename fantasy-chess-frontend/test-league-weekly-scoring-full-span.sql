-- =============================================================================
-- Full-span league scoring test (Supabase SQL Editor)
--
-- PREREQUISITE: Run migration first:
--   supabase/migrations/20250604000000_fix_process_weekly_results_dates.sql
--
-- INSTRUCTIONS:
--   1. Replace YOUR-LEAGUE-UUID-HERE in section 3 (DO block) only.
--   2. For queries in sections 1–2, 4–6: replace the UUID in each WHERE clause,
--      or run section 0 and copy your league id from the results.
-- =============================================================================

-- =============================================================================
-- 0) List leagues — copy your league id from here
-- =============================================================================
SELECT id, name, start_date, end_date,
       end_date - start_date AS season_days
FROM public.leagues
ORDER BY start_date DESC;

-- =============================================================================
-- 1) Pre-flight: function exists + Tuesday coverage for ONE league
--    Replace YOUR-LEAGUE-UUID-HERE below
-- =============================================================================
SELECT proname AS function_name, 'OK' AS status
FROM pg_proc
WHERE proname = 'process_weekly_results';

WITH league AS (
    SELECT id, name, start_date, end_date
    FROM public.leagues
    WHERE id = 'YOUR-LEAGUE-UUID-HERE'::uuid
),
tuesdays AS (
    SELECT gs::date AS tournament_date
    FROM league l,
         generate_series(l.start_date, l.end_date, interval '1 day') gs
    WHERE EXTRACT(DOW FROM gs) = 2
)
SELECT
    l.name AS league_name,
    t.tournament_date,
    (t.tournament_date - interval '1 day')::date AS expected_lineup_week_start,
    to_char(t.tournament_date, 'YYYY.MM.DD') AS expected_games_date,
    (SELECT count(*) FROM public.games g WHERE g.date = to_char(t.tournament_date, 'YYYY.MM.DD')) AS games_in_db,
    (SELECT count(*) FROM public.lineups lu
     WHERE lu.league_id = l.id
       AND lu.week_start_date = (t.tournament_date - interval '1 day')::date) AS lineups_for_monday
FROM league l
CROSS JOIN tuesdays t
ORDER BY t.tournament_date;

-- =============================================================================
-- 2) BEFORE snapshot (lineup points per week)
-- =============================================================================
SELECT
    lu.week_start_date,
    count(*) AS lineup_count,
    count(*) FILTER (WHERE lu.total_points IS NULL OR lu.total_points = 0) AS zero_point_lineups,
    round(avg(lu.total_points)::numeric, 2) AS avg_points,
    round(max(lu.total_points)::numeric, 2) AS max_points
FROM public.lineups lu
WHERE lu.league_id = 'YOUR-LEAGUE-UUID-HERE'::uuid
GROUP BY lu.week_start_date
ORDER BY lu.week_start_date;

-- =============================================================================
-- 3) PROCESS every Titled Tuesday in the league season (MAIN ACTION)
--    Set league UUID here only, then run this entire DO block once.
-- =============================================================================
DO $$
DECLARE
    v_league_id uuid := 'YOUR-LEAGUE-UUID-HERE';
    v_start date;
    v_end date;
    v_tuesday date;
    v_game_date text;
    v_lineup_monday date;
    v_games_count int;
BEGIN
    SELECT start_date, end_date INTO v_start, v_end
    FROM public.leagues
    WHERE id = v_league_id;

    IF v_start IS NULL THEN
        RAISE EXCEPTION 'League % not found', v_league_id;
    END IF;

    RAISE NOTICE 'Processing league % from % to %', v_league_id, v_start, v_end;

    v_tuesday := v_start;
    WHILE v_tuesday <= v_end LOOP
        IF EXTRACT(DOW FROM v_tuesday) = 2 THEN
            v_game_date := to_char(v_tuesday, 'YYYY.MM.DD');
            v_lineup_monday := v_tuesday - 1;

            SELECT count(*) INTO v_games_count
            FROM public.games
            WHERE date = v_game_date;

            RAISE NOTICE 'Tuesday % | games.date=% | lineups.week=% | games=%',
                v_tuesday, v_game_date, v_lineup_monday, v_games_count;

            IF v_games_count > 0 THEN
                PERFORM public.process_weekly_results(v_tuesday);
            ELSE
                RAISE NOTICE 'Skipping % (no games in DB yet)', v_tuesday;
            END IF;
        END IF;

        v_tuesday := v_tuesday + 1;
    END LOOP;

    RAISE NOTICE 'Done.';
END $$;

-- =============================================================================
-- 4) AFTER: week-by-week PASS/FAIL (stored vs recomputed from games)
-- =============================================================================
WITH league AS (
    SELECT id, start_date, end_date
    FROM public.leagues
    WHERE id = 'YOUR-LEAGUE-UUID-HERE'::uuid
),
tuesdays AS (
    SELECT gs::date AS tournament_date
    FROM league l,
         generate_series(l.start_date, l.end_date, interval '1 day') gs
    WHERE EXTRACT(DOW FROM gs) = 2
),
expected AS (
    SELECT
        t.tournament_date,
        (t.tournament_date - interval '1 day')::date AS lineup_week_start,
        to_char(t.tournament_date, 'YYYY.MM.DD') AS game_date
    FROM tuesdays t
),
recomputed AS (
    SELECT
        e.tournament_date,
        e.lineup_week_start,
        lu.total_points AS stored_points,
        COALESCE((
            SELECT round(sum(
                CASE
                    WHEN lower(g.white) = lower(cp.name) THEN g.white_points
                    WHEN lower(g.black) = lower(cp.name) THEN g.black_points
                    ELSE 0
                END
            )::numeric, 2)
            FROM unnest(lu.player_ids) pid
            JOIN public.chess_players cp ON cp.id = pid
            LEFT JOIN public.games g ON g.date = e.game_date
                AND (lower(g.white) = lower(cp.name) OR lower(g.black) = lower(cp.name))
        ), 0) AS expected_points
    FROM expected e
    JOIN public.lineups lu ON lu.league_id = (SELECT id FROM league)
        AND lu.week_start_date = e.lineup_week_start
    WHERE EXISTS (SELECT 1 FROM public.games g WHERE g.date = e.game_date)
)
SELECT
    tournament_date,
    lineup_week_start,
    count(*) AS lineups_checked,
    count(*) FILTER (WHERE stored_points IS DISTINCT FROM expected_points) AS mismatches,
    count(*) FILTER (WHERE stored_points > 0) AS lineups_with_points,
    CASE
        WHEN count(*) FILTER (WHERE stored_points IS DISTINCT FROM expected_points) = 0
        THEN 'PASS'
        ELSE 'FAIL'
    END AS week_status
FROM recomputed
GROUP BY tournament_date, lineup_week_start
ORDER BY tournament_date;

-- =============================================================================
-- 5) Mismatch detail (expect 0 rows when everything works)
-- =============================================================================
WITH league AS (
    SELECT id FROM public.leagues WHERE id = 'YOUR-LEAGUE-UUID-HERE'::uuid
),
tuesdays AS (
    SELECT gs::date AS tournament_date
    FROM public.leagues l,
         generate_series(l.start_date, l.end_date, interval '1 day') gs
    WHERE l.id = (SELECT id FROM league)
      AND EXTRACT(DOW FROM gs) = 2
),
expected AS (
    SELECT t.tournament_date,
           (t.tournament_date - interval '1 day')::date AS lineup_week_start,
           to_char(t.tournament_date, 'YYYY.MM.DD') AS game_date
    FROM tuesdays t
),
recomputed AS (
    SELECT
        e.tournament_date,
        lu.id AS lineup_id,
        u.username,
        b.name AS bot_name,
        lu.total_points AS stored_points,
        COALESCE((
            SELECT round(sum(
                CASE
                    WHEN lower(g.white) = lower(cp.name) THEN g.white_points
                    WHEN lower(g.black) = lower(cp.name) THEN g.black_points
                    ELSE 0
                END
            )::numeric, 2)
            FROM unnest(lu.player_ids) pid
            JOIN public.chess_players cp ON cp.id = pid
            LEFT JOIN public.games g ON g.date = e.game_date
                AND (lower(g.white) = lower(cp.name) OR lower(g.black) = lower(cp.name))
        ), 0) AS expected_points
    FROM expected e
    JOIN public.lineups lu ON lu.league_id = (SELECT id FROM league)
        AND lu.week_start_date = e.lineup_week_start
    LEFT JOIN public.users u ON u.id = lu.user_id
    LEFT JOIN public.bots b ON b.id = lu.bot_id
    WHERE EXISTS (SELECT 1 FROM public.games g WHERE g.date = e.game_date)
)
SELECT *
FROM recomputed
WHERE stored_points IS DISTINCT FROM expected_points
ORDER BY tournament_date, username, bot_name;

-- =============================================================================
-- 6) Season standings (same totals the app uses)
-- =============================================================================
SELECT
    COALESCE(u.username, b.name || ' (bot)') AS member,
    round(COALESCE(sum(lu.total_points), 0)::numeric, 2) AS season_total_points,
    count(lu.id) AS weeks_with_lineup
FROM public.lineups lu
LEFT JOIN public.users u ON u.id = lu.user_id
LEFT JOIN public.bots b ON b.id = lu.bot_id
WHERE lu.league_id = 'YOUR-LEAGUE-UUID-HERE'::uuid
GROUP BY COALESCE(u.username, b.name || ' (bot)')
ORDER BY season_total_points DESC;

-- =============================================================================
-- 7) One-off: score a single Tuesday (e.g. after titled_tuesday.py for that day)
-- =============================================================================
-- SELECT public.process_weekly_results('2026-06-02'::date);
