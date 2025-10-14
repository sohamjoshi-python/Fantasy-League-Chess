-- ==========================================
-- VERIFY LEADERBOARD IS WORKING
-- Run these queries to check everything is populated
-- ==========================================

-- Check 1: Verify demo users were created
SELECT 'Demo Users Check' as test, COUNT(*) as count, STRING_AGG(username, ', ') as usernames
FROM users 
WHERE email LIKE '%@fantasyleaguechess.app';

-- Check 2: Verify demo leagues were created
SELECT 'Demo Leagues Check' as test, COUNT(*) as count, STRING_AGG(name, ', ') as league_names
FROM leagues 
WHERE name IN ('Beginner League Alpha', 'Starter Cup', 'Casual Players League', 'First Timers Tournament');

-- Check 3: Verify lineups were created (should be 64 total)
SELECT 'Lineups Check' as test, COUNT(*) as total_lineups, 
       MIN(total_points) as min_points, 
       MAX(total_points) as max_points,
       ROUND(AVG(total_points)::numeric, 2) as avg_points
FROM lineups l
JOIN users u ON l.user_id = u.id
WHERE u.email LIKE '%@fantasyleaguechess.app';

-- Check 4: Test League Wins Leaderboard (should show 4 winners)
SELECT '=== LEAGUE WINS LEADERBOARD ===' as section;
SELECT username, wins, total_leagues, total_prize_money
FROM get_league_wins_leaderboard()
LIMIT 10;

-- Check 5: Test Total Points Leaderboard (should show all 8 users)
SELECT '=== TOTAL POINTS LEADERBOARD ===' as section;
SELECT username, total_points, leagues_played, average_points_per_league
FROM get_total_points_leaderboard()
LIMIT 10;

-- Check 6: Test Recent Winners (should show 4 winners from last 30 days)
SELECT '=== RECENT WINNERS ===' as section;
SELECT username, league_name, prize_amount, won_date
FROM get_recent_winners()
LIMIT 10;

-- Check 7: Test Weekly Top Performers (test with a recent week)
SELECT '=== WEEKLY TOP PERFORMERS ===' as section;
SELECT username, league_name, week_points
FROM get_weekly_top_performers((CURRENT_DATE - INTERVAL '17 days')::DATE)
LIMIT 10;

-- Summary
SELECT 
  '✅ LEADERBOARD VERIFICATION COMPLETE' as status,
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@fantasyleaguechess.app') as demo_users,
  (SELECT COUNT(*) FROM leagues WHERE name LIKE '%Beginner%' OR name LIKE '%Starter%' OR name LIKE '%Casual%' OR name LIKE '%First%') as demo_leagues,
  (SELECT COUNT(*) FROM lineups WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@fantasyleaguechess.app')) as demo_lineups,
  (SELECT COUNT(*) FROM get_league_wins_leaderboard()) as wins_leaderboard_entries,
  (SELECT COUNT(*) FROM get_total_points_leaderboard()) as points_leaderboard_entries,
  (SELECT COUNT(*) FROM get_recent_winners()) as recent_winners;

