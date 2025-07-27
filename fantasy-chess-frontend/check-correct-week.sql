-- Check lineups with the correct Monday week start date
-- Run this in your Supabase SQL editor

-- Check what week start dates exist in lineups
SELECT 
    'All Week Start Dates' as check_type,
    week_start_date,
    COUNT(*) as lineup_count
FROM lineups 
GROUP BY week_start_date
ORDER BY week_start_date;

-- Check lineups for the correct week (Monday 2025-07-21)
SELECT 
    'Lineups for Week of 2025-07-21 (Monday)' as check_type,
    COUNT(*) as lineup_count
FROM lineups 
WHERE week_start_date = '2025-07-21';

-- Show detailed lineup information for the correct week
SELECT 
    u.username,
    l.name as league_name,
    ln.total_points,
    ln.player_ids,
    array_length(ln.player_ids, 1) as player_count,
    ln.created_at,
    ln.updated_at
FROM lineups ln
JOIN users u ON ln.user_id = u.id
JOIN leagues l ON ln.league_id = l.id
WHERE ln.week_start_date = '2025-07-21'
ORDER BY ln.total_points DESC;

-- Check if there are any games for the correct week
SELECT 
    'Games for Week of 2025-07-21' as check_type,
    COUNT(*) as total_games,
    COUNT(CASE WHEN white_points > 0 OR black_points > 0 THEN 1 END) as games_with_points
FROM games 
WHERE date = '2025-07-21';

-- Show sample games for the correct week
SELECT 
    white,
    black,
    white_points,
    black_points,
    result
FROM games 
WHERE date = '2025-07-21' 
  AND (white_points > 0 OR black_points > 0)
ORDER BY white_points + black_points DESC
LIMIT 10;

-- Summary for the correct week
SELECT 
    'SUMMARY for Week of 2025-07-21' as category,
    COUNT(*) as count,
    COALESCE(SUM(total_points), 0) as total_points,
    COALESCE(AVG(total_points), 0) as avg_points
FROM lineups 
WHERE week_start_date = '2025-07-21'
UNION ALL
SELECT 
    'LINEUPS WITH POINTS' as category,
    COUNT(*) as count,
    COALESCE(SUM(total_points), 0) as total_points,
    COALESCE(AVG(total_points), 0) as avg_points
FROM lineups 
WHERE week_start_date = '2025-07-21' AND total_points > 0
UNION ALL
SELECT 
    'LINEUPS WITH 0 POINTS' as category,
    COUNT(*) as count,
    COALESCE(SUM(total_points), 0) as total_points,
    COALESCE(AVG(total_points), 0) as avg_points
FROM lineups 
WHERE week_start_date = '2025-07-21' AND total_points = 0; 