-- ========================================
-- TEST WEEKLY POINTS SYSTEM
-- Modify league dates and run weekly results function
-- ========================================

-- Step 1: Show current league information
SELECT 
    'CURRENT_LEAGUE_INFO' as status,
    id,
    name,
    start_date,
    end_date,
    draft_completed,
    marketplace_completed,
    member_ids
FROM leagues 
WHERE name LIKE '%Dev League%' OR name LIKE '%Test%' OR name LIKE '%League%'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Update league start date to last week (for testing)
UPDATE leagues 
SET 
    start_date = '2025-07-14'::DATE,  -- Last Monday
    end_date = '2025-08-11'::DATE     -- 4 weeks from start
WHERE name LIKE '%Dev League%' OR name LIKE '%Test%' OR name LIKE '%League%'
AND start_date > CURRENT_DATE;

-- Step 3: Show updated league information
SELECT 
    'UPDATED_LEAGUE_INFO' as status,
    id,
    name,
    start_date,
    end_date,
    draft_completed,
    marketplace_completed,
    member_ids
FROM leagues 
WHERE name LIKE '%Dev League%' OR name LIKE '%Test%' OR name LIKE '%League%'
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Check if there are any games in the database for last week
SELECT 
    'GAMES_CHECK' as status,
    COUNT(*) as total_games,
    MIN(date) as earliest_game,
    MAX(date) as latest_game
FROM games;

-- Step 5: Show sample games from last week
SELECT 
    'SAMPLE_GAMES' as status,
    date,
    white,
    black,
    result,
    white_points,
    black_points,
    white_accuracy,
    black_accuracy
FROM games 
WHERE date::DATE >= '2025-07-14' AND date::DATE <= '2025-07-20'
ORDER BY date
LIMIT 10;

-- Step 6: Check current lineups before processing
SELECT 
    'LINEUPS_BEFORE' as status,
    COUNT(*) as total_lineups,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT league_id) as unique_leagues
FROM lineups;

-- Step 7: Show sample lineups before processing
SELECT 
    'SAMPLE_LINEUPS_BEFORE' as status,
    l.id,
    l.user_id,
    l.league_id,
    l.week_start_date,
    l.total_points,
    array_length(l.player_ids, 1) as player_count,
    u.username
FROM lineups l
LEFT JOIN users u ON l.user_id = u.id
ORDER BY l.created_at DESC
LIMIT 10;

-- Step 8: Run the weekly results function for last week
SELECT 
    'RUNNING_WEEKLY_FUNCTION' as status,
    'Processing week starting 2025-07-14' as message;

-- Call the function
SELECT process_weekly_results_enhanced('2025-07-14'::DATE);

-- Step 9: Check lineups after processing
SELECT 
    'LINEUPS_AFTER' as status,
    COUNT(*) as total_lineups,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT league_id) as unique_leagues
FROM lineups;

-- Step 10: Show updated lineups with points
SELECT 
    'UPDATED_LINEUPS' as status,
    l.id,
    l.user_id,
    l.league_id,
    l.week_start_date,
    l.total_points,
    array_length(l.player_ids, 1) as player_count,
    u.username,
    lg.name as league_name
FROM lineups l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN leagues lg ON l.league_id = lg.id
WHERE l.week_start_date = '2025-07-14'
ORDER BY l.total_points DESC;

-- Step 11: Show detailed breakdown for one user's lineup
SELECT 
    'DETAILED_LINEUP_BREAKDOWN' as status,
    l.user_id,
    u.username,
    l.league_id,
    lg.name as league_name,
    l.week_start_date,
    l.total_points,
    l.player_ids,
    cp.name as player_name,
    cp.accuracy as player_accuracy
FROM lineups l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN leagues lg ON l.league_id = lg.id
LEFT JOIN chess_players cp ON cp.id = ANY(l.player_ids)
WHERE l.week_start_date = '2025-07-14'
AND l.total_points > 0
ORDER BY l.total_points DESC
LIMIT 20;

-- Step 12: Check if any games were found for the players in lineups
SELECT 
    'GAMES_FOR_LINEUP_PLAYERS' as status,
    g.date,
    g.white,
    g.black,
    g.white_points,
    g.black_points,
    cp.name as lineup_player,
    l.user_id,
    u.username
FROM games g
JOIN chess_players cp ON (g.white = cp.name OR g.black = cp.name)
JOIN lineups l ON cp.id = ANY(l.player_ids)
JOIN users u ON l.user_id = u.id
WHERE g.date::DATE >= '2025-07-14' 
AND g.date::DATE <= '2025-07-20'
AND l.week_start_date = '2025-07-14'
ORDER BY g.date, cp.name
LIMIT 20;

-- Step 13: Summary of results
SELECT 
    'SUMMARY' as status,
    'Weekly points processing completed' as message,
    COUNT(*) as total_lineups_processed,
    COUNT(CASE WHEN total_points > 0 THEN 1 END) as lineups_with_points,
    AVG(total_points) as average_points,
    MAX(total_points) as highest_points,
    MIN(total_points) as lowest_points
FROM lineups 
WHERE week_start_date = '2025-07-14';

-- Step 14: Reset league dates back to original (optional)
-- Uncomment the following lines if you want to reset the dates:

/*
UPDATE leagues 
SET 
    start_date = '2025-07-28'::DATE,  -- Next Monday
    end_date = '2025-08-25'::DATE     -- 4 weeks from start
WHERE name LIKE '%Dev League%' OR name LIKE '%Test%' OR name LIKE '%League%'
AND start_date = '2025-07-14'::DATE;

SELECT 
    'RESET_LEAGUE_DATES' as status,
    'League dates reset to original' as message;
*/ 