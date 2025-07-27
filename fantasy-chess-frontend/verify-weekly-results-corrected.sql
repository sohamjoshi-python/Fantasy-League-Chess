-- Verify weekly results processing for the correct week (Monday 2025-07-21)
-- Run this in your Supabase SQL editor to check if points were calculated correctly

-- Set the correct week start date (Monday)
DO $$
DECLARE
    check_week_date DATE := '2025-07-21';  -- Monday, not Tuesday
    league_count INTEGER;
    lineup_count INTEGER;
    total_points_calc DECIMAL(10,2);
    avg_points_calc DECIMAL(10,2);
BEGIN
    RAISE NOTICE '=== WEEKLY RESULTS VERIFICATION FOR WEEK STARTING % ===', check_week_date;
    
    -- Check how many leagues were active during this week
    SELECT COUNT(*) INTO league_count
    FROM leagues 
    WHERE start_date <= check_week_date AND end_date >= check_week_date;
    
    RAISE NOTICE 'Active leagues during this week: %', league_count;
    
    -- Check how many lineups were processed
    SELECT COUNT(*) INTO lineup_count
    FROM lineups 
    WHERE week_start_date = check_week_date;
    
    RAISE NOTICE 'Lineups processed for this week: %', lineup_count;
    
    -- Check total points calculated
    SELECT COALESCE(SUM(lineups.total_points), 0) INTO total_points_calc
    FROM lineups 
    WHERE week_start_date = check_week_date;
    
    RAISE NOTICE 'Total points calculated: %', total_points_calc;
    
    -- Check average points per lineup
    SELECT COALESCE(AVG(lineups.total_points), 0) INTO avg_points_calc
    FROM lineups 
    WHERE week_start_date = check_week_date;
    
    RAISE NOTICE 'Average points per lineup: %.2f', avg_points_calc;
    
END $$;

-- Show detailed breakdown by league for the correct week
SELECT 
    l.name as league_name,
    l.id as league_id,
    COUNT(ln.id) as lineups_count,
    COALESCE(SUM(ln.total_points), 0) as total_league_points,
    COALESCE(AVG(ln.total_points), 0) as avg_points_per_lineup,
    MIN(ln.total_points) as min_points,
    MAX(ln.total_points) as max_points
FROM leagues l
LEFT JOIN lineups ln ON l.id = ln.league_id AND ln.week_start_date = '2025-07-21'
WHERE l.start_date <= '2025-07-21' AND l.end_date >= '2025-07-21'
GROUP BY l.id, l.name
ORDER BY total_league_points DESC;

-- Show top performers for the correct week
SELECT 
    u.username,
    l.name as league_name,
    ln.total_points,
    ln.player_ids,
    ln.created_at,
    ln.updated_at
FROM lineups ln
JOIN users u ON ln.user_id = u.id
JOIN leagues l ON ln.league_id = l.id
WHERE ln.week_start_date = '2025-07-21'
ORDER BY ln.total_points DESC
LIMIT 20;

-- Show lineups with 0 points (potential issues) for the correct week
SELECT 
    u.username,
    l.name as league_name,
    ln.total_points,
    ln.player_ids,
    CASE 
        WHEN ln.player_ids IS NULL OR array_length(ln.player_ids, 1) = 0 
        THEN 'No players in lineup'
        WHEN array_length(ln.player_ids, 1) < 5 
        THEN 'Fewer than 5 players'
        ELSE 'Has players but 0 points'
    END as issue_type
FROM lineups ln
JOIN users u ON ln.user_id = u.id
JOIN leagues l ON ln.league_id = l.id
WHERE ln.week_start_date = '2025-07-21' 
  AND ln.total_points = 0
ORDER BY l.name, u.username;

-- Check if there are any games data for the correct week
SELECT 
    COUNT(*) as total_games,
    COUNT(DISTINCT white) as unique_white_players,
    COUNT(DISTINCT black) as unique_black_players,
    COUNT(CASE WHEN white_points > 0 OR black_points > 0 THEN 1 END) as games_with_points
FROM games 
WHERE date = '2025-07-21';

-- Show sample games with points for the correct week
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

-- Show summary statistics for the correct week
SELECT 
    'SUMMARY' as category,
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