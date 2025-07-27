-- ========================================
-- CHECK AND FIX WEEK PROCESSING
-- Check current league dates and process the correct week
-- ========================================

-- Step 1: Check current league dates
SELECT 
    'CURRENT_LEAGUE_DATES' as status,
    id,
    name,
    start_date,
    end_date,
    draft_completed,
    marketplace_completed
FROM leagues 
ORDER BY created_at DESC;

-- Step 2: Check what lineups already exist
SELECT 
    'EXISTING_LINEUPS' as status,
    week_start_date,
    COUNT(*) as lineup_count,
    COUNT(CASE WHEN total_points > 0 THEN 1 END) as lineups_with_points,
    AVG(total_points) as avg_points
FROM lineups 
GROUP BY week_start_date
ORDER BY week_start_date;

-- Step 3: Show detailed lineup info
SELECT 
    'DETAILED_LINEUPS' as status,
    l.week_start_date,
    l.total_points,
    u.username,
    lg.name as league_name,
    array_length(l.player_ids, 1) as player_count
FROM lineups l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN leagues lg ON l.league_id = lg.id
ORDER BY l.week_start_date DESC, l.total_points DESC;

-- Step 4: Check if there are games for the existing lineup week (2025-07-21)
SELECT 
    'GAMES_FOR_EXISTING_WEEK' as status,
    COUNT(*) as total_games,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as earliest_game,
    MAX(date) as latest_game
FROM games 
WHERE date::DATE >= '2025-07-21' AND date::DATE <= '2025-07-27';

-- Step 5: Show sample games for the existing week
SELECT 
    'SAMPLE_GAMES_EXISTING_WEEK' as status,
    date,
    white,
    black,
    white_points,
    black_points,
    result
FROM games 
WHERE date::DATE >= '2025-07-21' AND date::DATE <= '2025-07-27'
AND (white_points > 0 OR black_points > 0)
ORDER BY white_points + black_points DESC
LIMIT 10;

-- Step 6: Process the existing week (2025-07-21) instead of creating a new one
SELECT 
    'PROCESSING_EXISTING_WEEK' as status,
    'Processing week starting 2025-07-21 (Monday) to 2025-07-27 (Sunday)' as message;

-- Call the function for the existing week
SELECT process_weekly_results_enhanced('2025-07-21'::DATE);

-- Step 7: Check results after processing
SELECT 
    'RESULTS_AFTER_PROCESSING' as status,
    l.week_start_date,
    l.total_points,
    u.username,
    lg.name as league_name,
    array_length(l.player_ids, 1) as player_count
FROM lineups l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN leagues lg ON l.league_id = lg.id
WHERE l.week_start_date = '2025-07-21'
ORDER BY l.total_points DESC;

-- Step 8: Summary of results
SELECT 
    'FINAL_SUMMARY' as status,
    'Weekly points processing completed' as message,
    COUNT(*) as total_lineups_processed,
    COUNT(CASE WHEN total_points > 0 THEN 1 END) as lineups_with_points,
    AVG(total_points) as average_points,
    MAX(total_points) as highest_points,
    MIN(total_points) as lowest_points
FROM lineups 
WHERE week_start_date = '2025-07-21';

-- Step 9: Check if any players in the lineups have games
SELECT 
    'PLAYERS_WITH_GAMES_CHECK' as status,
    cp.name as player_name,
    COUNT(g.id) as game_count,
    SUM(CASE WHEN g.white = cp.name THEN g.white_points ELSE 0 END) +
    SUM(CASE WHEN g.black = cp.name THEN g.black_points ELSE 0 END) as total_points
FROM lineups l
JOIN chess_players cp ON cp.id = ANY(l.player_ids)
LEFT JOIN games g ON (g.white = cp.name OR g.black = cp.name) 
    AND g.date::DATE >= '2025-07-21' AND g.date::DATE <= '2025-07-27'
WHERE l.week_start_date = '2025-07-21'
GROUP BY cp.id, cp.name
HAVING COUNT(g.id) > 0
ORDER BY total_points DESC
LIMIT 10; 