-- Quick diagnostic to check key data points
-- Run this in your Supabase SQL editor

-- 1. Check if the league exists and is active
SELECT 
    'League Status' as check_type,
    name,
    start_date,
    end_date,
    draft_completed,
    marketplace_completed,
    array_length(member_ids, 1) as member_count
FROM leagues 
WHERE id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2';

-- 2. Check if teams exist for this league
SELECT 
    'Team Status' as check_type,
    COUNT(*) as team_count,
    COUNT(DISTINCT user_id) as unique_users
FROM teams 
WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2';

-- 3. Check team details
SELECT 
    'Team Details' as check_type,
    t.user_id,
    u.username,
    array_length(t.player_ids, 1) as player_count,
    t.player_ids
FROM teams t
JOIN users u ON t.user_id = u.id
WHERE t.league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2';

-- 4. Check if any games exist for the week
SELECT 
    'Games Status' as check_type,
    COUNT(*) as total_games,
    COUNT(CASE WHEN white_points > 0 OR black_points > 0 THEN 1 END) as games_with_points
FROM games 
WHERE date = '2025-07-22';

-- 5. Check if any lineups exist for the week
SELECT 
    'Lineup Status' as check_type,
    COUNT(*) as lineup_count
FROM lineups 
WHERE week_start_date = '2025-07-22';

-- 6. Test the function manually (uncomment to run)
-- SELECT process_weekly_results_enhanced('2025-07-22');

-- 7. Check if lineups were created after running the function
-- SELECT 
--     'After Function' as check_type,
--     COUNT(*) as lineup_count
-- FROM lineups 
-- WHERE week_start_date = '2025-07-22'; 