-- ========================================
-- DEBUG WEEKLY PROCESSING
-- Comprehensive diagnostic to find the root cause
-- ========================================

-- Step 1: Check what leagues exist and their dates
SELECT 
    'LEAGUES_CHECK' as status,
    id,
    name,
    start_date,
    end_date,
    draft_completed,
    marketplace_completed,
    array_length(member_ids, 1) as member_count,
    member_ids
FROM leagues 
ORDER BY created_at DESC;

-- Step 2: Check if any leagues match our test criteria
SELECT 
    'LEAGUES_FOR_TEST_WEEK' as status,
    COUNT(*) as matching_leagues,
    string_agg(name, ', ') as league_names
FROM leagues 
WHERE start_date <= '2025-07-14'::DATE AND end_date >= '2025-07-14'::DATE;

-- Step 3: Check league_members table structure and data
SELECT 
    'LEAGUE_MEMBERS_CHECK' as status,
    COUNT(*) as total_members,
    COUNT(DISTINCT league_id) as unique_leagues,
    COUNT(DISTINCT user_id) as unique_users
FROM league_members;

-- Step 4: Show league members for our test leagues
SELECT 
    'LEAGUE_MEMBERS_FOR_TEST' as status,
    lm.league_id,
    l.name as league_name,
    lm.user_id,
    u.username,
    lm.created_at
FROM league_members lm
JOIN leagues l ON lm.league_id = l.id
JOIN users u ON lm.user_id = u.id
WHERE l.start_date <= '2025-07-14'::DATE AND l.end_date >= '2025-07-14'::DATE
ORDER BY l.name, u.username;

-- Step 5: Check teams table
SELECT 
    'TEAMS_CHECK' as status,
    COUNT(*) as total_teams,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT league_id) as unique_leagues
FROM teams;

-- Step 6: Show teams for our test leagues
SELECT 
    'TEAMS_FOR_TEST' as status,
    t.league_id,
    l.name as league_name,
    t.user_id,
    u.username,
    array_length(t.player_ids, 1) as player_count,
    t.player_ids
FROM teams t
JOIN leagues l ON t.league_id = l.id
JOIN users u ON t.user_id = u.id
WHERE l.start_date <= '2025-07-14'::DATE AND l.end_date >= '2025-07-14'::DATE
ORDER BY l.name, u.username;

-- Step 7: Check if there are any chess players
SELECT 
    'CHESS_PLAYERS_CHECK' as status,
    COUNT(*) as total_players,
    COUNT(CASE WHEN accuracy IS NOT NULL THEN 1 END) as players_with_accuracy
FROM chess_players;

-- Step 8: Check games data for the test week
SELECT 
    'GAMES_FOR_TEST_WEEK' as status,
    COUNT(*) as total_games,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as earliest_game,
    MAX(date) as latest_game
FROM games 
WHERE date::DATE >= '2025-07-14' AND date::DATE <= '2025-07-20';

-- Step 9: Show sample games with points
SELECT 
    'SAMPLE_GAMES_WITH_POINTS' as status,
    date,
    white,
    black,
    white_points,
    black_points,
    result
FROM games 
WHERE date::DATE >= '2025-07-14' AND date::DATE <= '2025-07-20'
AND (white_points > 0 OR black_points > 0)
ORDER BY white_points + black_points DESC
LIMIT 10;

-- Step 10: Check if any players in teams have games
SELECT 
    'PLAYERS_WITH_GAMES_CHECK' as status,
    cp.name as player_name,
    COUNT(g.id) as game_count,
    SUM(CASE WHEN g.white = cp.name THEN g.white_points ELSE 0 END) +
    SUM(CASE WHEN g.black = cp.name THEN g.black_points ELSE 0 END) as total_points
FROM chess_players cp
JOIN teams t ON cp.id = ANY(t.player_ids)
JOIN leagues l ON t.league_id = l.id
LEFT JOIN games g ON (g.white = cp.name OR g.black = cp.name) 
    AND g.date::DATE >= '2025-07-14' AND g.date::DATE <= '2025-07-20'
WHERE l.start_date <= '2025-07-14'::DATE AND l.end_date >= '2025-07-14'::DATE
GROUP BY cp.id, cp.name
HAVING COUNT(g.id) > 0
ORDER BY total_points DESC
LIMIT 10;

-- Step 11: Check current lineups
SELECT 
    'CURRENT_LINEUPS' as status,
    COUNT(*) as total_lineups,
    COUNT(DISTINCT week_start_date) as unique_weeks,
    MIN(week_start_date) as earliest_week,
    MAX(week_start_date) as latest_week
FROM lineups;

-- Step 12: Show any existing lineups for the test week
SELECT 
    'EXISTING_LINEUPS_FOR_TEST_WEEK' as status,
    l.id,
    l.user_id,
    u.username,
    l.league_id,
    lg.name as league_name,
    l.week_start_date,
    l.total_points,
    array_length(l.player_ids, 1) as player_count
FROM lineups l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN leagues lg ON l.league_id = lg.id
WHERE l.week_start_date = '2025-07-14'
ORDER BY l.total_points DESC;

-- Step 13: Test the function manually with debug output
DO $$
DECLARE
    league_record RECORD;
    member RECORD;
    team_record RECORD;
    player_count INTEGER;
    game_count INTEGER;
BEGIN
    RAISE NOTICE '=== STARTING MANUAL FUNCTION TEST ===';
    
    -- Check how many leagues match our criteria
    SELECT COUNT(*) INTO player_count
    FROM leagues 
    WHERE start_date <= '2025-07-14'::DATE AND end_date >= '2025-07-14'::DATE;
    
    RAISE NOTICE 'Leagues matching criteria: %', player_count;
    
    -- Loop through matching leagues
    FOR league_record IN 
        SELECT * FROM leagues 
        WHERE start_date <= '2025-07-14'::DATE AND end_date >= '2025-07-14'::DATE
    LOOP
        RAISE NOTICE 'Processing league: % (ID: %)', league_record.name, league_record.id;
        
        -- Check members in this league
        SELECT COUNT(*) INTO player_count
        FROM league_members 
        WHERE league_id = league_record.id;
        
        RAISE NOTICE '  League has % members', player_count;
        
        -- Loop through members
        FOR member IN 
            SELECT * FROM league_members WHERE league_id = league_record.id
        LOOP
            RAISE NOTICE '  Processing member: %', member.user_id;
            
            -- Check if member has a team
            SELECT * INTO team_record
            FROM teams
            WHERE user_id = member.user_id AND league_id = league_record.id;
            
            IF team_record IS NULL THEN
                RAISE NOTICE '    Member has NO team';
            ELSE
                RAISE NOTICE '    Member has team with % players', array_length(team_record.player_ids, 1);
                
                -- Check if any of these players have games
                SELECT COUNT(*) INTO game_count
                FROM chess_players cp
                JOIN games g ON (g.white = cp.name OR g.black = cp.name)
                WHERE cp.id = ANY(team_record.player_ids)
                AND g.date::DATE >= '2025-07-14' AND g.date::DATE <= '2025-07-20';
                
                RAISE NOTICE '    Players have % games in test week', game_count;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '=== MANUAL FUNCTION TEST COMPLETE ===';
END $$; 