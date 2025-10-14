-- Check Demo Users
SELECT 'Demo Users:' as info, COUNT(*) as count 
FROM users WHERE email LIKE '%@fantasyleaguechess.app';

SELECT username, email, created_at
FROM users 
WHERE email LIKE '%@fantasyleaguechess.app'
ORDER BY created_at;

-- Check Demo Leagues
SELECT 'Demo Leagues:' as info, COUNT(*) as count
FROM leagues 
WHERE name IN ('Beginner League Alpha', 'Starter Cup', 'Casual Players League', 'First Timers Tournament');

SELECT name, start_date, end_date, buy_in, array_length(member_ids, 1) as members
FROM leagues 
WHERE name IN ('Beginner League Alpha', 'Starter Cup', 'Casual Players League', 'First Timers Tournament')
ORDER BY start_date;

-- Check Demo Lineups
SELECT 'Demo Lineups:' as info, COUNT(*) as count
FROM lineups l
JOIN users u ON l.user_id = u.id
WHERE u.email LIKE '%@fantasyleaguechess.app';

-- Total Points Per User
SELECT u.username, COUNT(*) as lineup_count, SUM(l.total_points) as total_points
FROM lineups l
JOIN users u ON l.user_id = u.id
WHERE u.email LIKE '%@fantasyleaguechess.app'
GROUP BY u.username
ORDER BY total_points DESC;

-- Calculate Winners
WITH user_totals AS (
  SELECT 
    lg.name as league_name,
    u.username,
    SUM(ln.total_points) as total_points
  FROM lineups ln
  JOIN users u ON ln.user_id = u.id
  JOIN leagues lg ON ln.league_id = lg.id
  WHERE u.email LIKE '%@fantasyleaguechess.app'
  GROUP BY lg.name, u.username
),
winners AS (
  SELECT DISTINCT ON (league_name)
    league_name,
    username as winner,
    total_points
  FROM user_totals
  ORDER BY league_name, total_points DESC
)
SELECT * FROM winners;

-- Test Leaderboard Functions
SELECT 'League Wins Count:' as info, COUNT(*) as count FROM get_league_wins_leaderboard();
SELECT * FROM get_league_wins_leaderboard();

SELECT 'Total Points Count:' as info, COUNT(*) as count FROM get_total_points_leaderboard();
SELECT * FROM get_total_points_leaderboard() LIMIT 10;

SELECT 'Recent Winners Count:' as info, COUNT(*) as count FROM get_recent_winners();
SELECT * FROM get_recent_winners();

