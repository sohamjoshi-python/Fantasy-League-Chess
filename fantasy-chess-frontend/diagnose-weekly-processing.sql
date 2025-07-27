-- Diagnostic script to understand weekly processing issues
-- Run this in your Supabase SQL editor

-- Check all leagues and their dates
SELECT 
    id,
    name,
    start_date,
    end_date,
    draft_completed,
    marketplace_completed,
    member_ids,
    array_length(member_ids, 1) as member_count
FROM leagues
ORDER BY start_date;

-- Check if there are any lineups at all
SELECT 
    COUNT(*) as total_lineups,
    COUNT(DISTINCT week_start_date) as unique_weeks,
    MIN(week_start_date) as earliest_week,
    MAX(week_start_date) as latest_week
FROM lineups;

-- Check specific week 2025-07-22
SELECT 
    '2025-07-22' as check_date,
    COUNT(*) as lineups_for_week
FROM lineups 
WHERE week_start_date = '2025-07-22';

-- Check if there are any teams for the league
SELECT 
    l.name as league_name,
    l.id as league_id,
    l.start_date,
    l.end_date,
    COUNT(t.id) as team_count,
    COUNT(DISTINCT t.user_id) as unique_users_with_teams
FROM leagues l
LEFT JOIN teams t ON l.id = t.league_id
WHERE l.start_date <= '2025-07-22' AND l.end_date >= '2025-07-22'
GROUP BY l.id, l.name, l.start_date, l.end_date;

-- Check team details for the specific league
SELECT 
    t.user_id,
    u.username,
    t.player_ids,
    array_length(t.player_ids, 1) as player_count,
    t.created_at
FROM teams t
JOIN users u ON t.user_id = u.id
WHERE t.league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2';

-- Check if there are any games data for the week
SELECT 
    COUNT(*) as total_games,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as earliest_game_date,
    MAX(date) as latest_game_date
FROM games;

-- Check games for the specific week
SELECT 
    date,
    COUNT(*) as games_count,
    COUNT(CASE WHEN white_points > 0 OR black_points > 0 THEN 1 END) as games_with_points
FROM games 
WHERE date = '2025-07-22'
GROUP BY date;

-- Check what weeks should have been processed
SELECT 
    l.name as league_name,
    l.start_date,
    l.end_date,
    generate_series(
        l.start_date::date, 
        l.end_date::date, 
        '7 days'::interval
    )::date as week_start
FROM leagues l
WHERE l.start_date <= '2025-07-22' AND l.end_date >= '2025-07-22';

-- Check if the process_weekly_results_enhanced function exists
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'process_weekly_results_enhanced';

-- Test the function manually for the week
-- Uncomment the line below to test the function
-- SELECT process_weekly_results_enhanced('2025-07-22');

-- Check what would happen if we run the function
DO $$
DECLARE
    league_record RECORD;
    user_record RECORD;
    team_record RECORD;
    player_count INTEGER;
BEGIN
    RAISE NOTICE '=== DIAGNOSTIC: What would happen for week 2025-07-22 ===';
    
    -- Check active leagues
    FOR league_record IN 
        SELECT * FROM leagues 
        WHERE start_date <= '2025-07-22' AND end_date >= '2025-07-22'
    LOOP
        RAISE NOTICE 'League: % (ID: %)', league_record.name, league_record.id;
        RAISE NOTICE '  Start: %, End: %', league_record.start_date, league_record.end_date;
        RAISE NOTICE '  Members: %', league_record.member_ids;
        
        -- Check each member
        FOR user_record IN 
            SELECT unnest(league_record.member_ids) as user_id
        LOOP
            RAISE NOTICE '  User: %', user_record.user_id;
            
            -- Check if user has a team
            SELECT * INTO team_record 
            FROM teams 
            WHERE user_id = user_record.user_id 
              AND league_id = league_record.id;
            
            IF team_record IS NOT NULL THEN
                player_count := array_length(team_record.player_ids, 1);
                RAISE NOTICE '    Has team with % players', player_count;
            ELSE
                RAISE NOTICE '    NO TEAM FOUND';
            END IF;
        END LOOP;
    END LOOP;
END $$; 