-- ==========================================
-- DEBUG LEADERBOARD - Check What's Happening
-- ==========================================

-- Step 1: Check if demo users were created
SELECT '=== DEMO USERS ===' as section;
SELECT id, username, email, created_at
FROM users 
WHERE email LIKE '%@fantasyleaguechess.app'
ORDER BY created_at;

-- Step 2: Check if demo leagues were created
SELECT '=== DEMO LEAGUES ===' as section;
SELECT id, name, start_date, end_date, buy_in, 
       array_length(member_ids, 1) as member_count,
       draft_completed, marketplace_completed, payout_processed
FROM leagues 
WHERE name IN ('Beginner League Alpha', 'Starter Cup', 'Casual Players League', 'First Timers Tournament')
ORDER BY start_date;

-- Step 3: Check if lineups were created
SELECT '=== DEMO LINEUPS ===' as section;
SELECT l.league_id, lg.name as league_name, l.user_id, u.username, 
       l.week_start_date, l.total_points
FROM lineups l
JOIN users u ON l.user_id = u.id
JOIN leagues lg ON l.league_id = lg.id
WHERE u.email LIKE '%@fantasyleaguechess.app'
ORDER BY l.league_id, l.week_start_date, l.user_id
LIMIT 20;

-- Step 4: Count lineups per user
SELECT '=== LINEUPS PER USER ===' as section;
SELECT u.username, COUNT(*) as lineup_count, SUM(l.total_points) as total_points
FROM lineups l
JOIN users u ON l.user_id = u.id
WHERE u.email LIKE '%@fantasyleaguechess.app'
GROUP BY u.id, u.username
ORDER BY total_points DESC;

-- Step 5: Calculate winners manually (who should win each league)
SELECT '=== CALCULATED WINNERS ===' as section;
WITH user_league_totals AS (
  SELECT 
    lg.id as league_id,
    lg.name as league_name,
    u.username,
    SUM(ln.total_points) as total_points
  FROM lineups ln
  JOIN users u ON ln.user_id = u.id
  JOIN leagues lg ON ln.league_id = lg.id
  WHERE u.email LIKE '%@fantasyleaguechess.app'
  GROUP BY lg.id, lg.name, u.id, u.username
),
league_winners AS (
  SELECT DISTINCT ON (league_id)
    league_id,
    league_name,
    username as winner,
    total_points
  FROM user_league_totals
  ORDER BY league_id, total_points DESC
)
SELECT * FROM league_winners;

-- Step 6: Test the leaderboard functions
SELECT '=== LEAGUE WINS LEADERBOARD ===' as section;
SELECT * FROM get_league_wins_leaderboard();

SELECT '=== TOTAL POINTS LEADERBOARD ===' as section;
SELECT * FROM get_total_points_leaderboard();

SELECT '=== RECENT WINNERS ===' as section;
SELECT * FROM get_recent_winners();

SELECT '=== WEEKLY TOP PERFORMERS (Week of ' || (CURRENT_DATE - INTERVAL '17 days')::DATE || ') ===' as section;
SELECT * FROM get_weekly_top_performers((CURRENT_DATE - INTERVAL '17 days')::DATE);

-- Step 7: Check if there's an issue with the end_date filtering
SELECT '=== LEAGUES END DATE CHECK ===' as section;
SELECT name, end_date, 
       CASE 
         WHEN end_date < CURRENT_DATE THEN 'ENDED (should show on leaderboard)'
         WHEN end_date = CURRENT_DATE THEN 'ENDING TODAY'
         ELSE 'FUTURE (should NOT show)'
       END as status
FROM leagues 
WHERE name IN ('Beginner League Alpha', 'Starter Cup', 'Casual Players League', 'First Timers Tournament');

-- Step 8: Check the actual query that get_league_wins_leaderboard runs
SELECT '=== DEBUG: League Winners CTE ===' as section;
WITH league_winners AS (
  SELECT DISTINCT ON (ln.league_id)
    ln.league_id,
    ln.user_id as winner_id,
    l.buy_in * COALESCE(array_length(l.member_ids, 1), 0) as prize,
    SUM(ln.total_points) as total_points
  FROM lineups ln
  JOIN leagues l ON ln.league_id = l.id
  WHERE l.end_date < CURRENT_DATE
    AND l.payout_processed = false
  GROUP BY ln.league_id, ln.user_id, l.buy_in, l.member_ids
  ORDER BY ln.league_id, SUM(ln.total_points) DESC
)
SELECT lw.*, u.username, lg.name as league_name
FROM league_winners lw
JOIN users u ON lw.winner_id = u.id
JOIN leagues lg ON lw.league_id = lg.id;

