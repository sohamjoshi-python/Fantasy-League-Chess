-- ========================================
-- FIX LINEUP CREATION
-- Fix lineups that only have 1 player instead of 5
-- ========================================

-- Step 1: Check what teams exist and how many players they have
SELECT 
    'TEAMS_CHECK' as status,
    t.id,
    t.user_id,
    u.username,
    t.league_id,
    lg.name as league_name,
    array_length(t.player_ids, 1) as player_count,
    t.player_ids
FROM teams t
JOIN users u ON t.user_id = u.id
JOIN leagues lg ON t.league_id = lg.id
ORDER BY array_length(t.player_ids, 1) DESC;

-- Step 2: Check if teams have enough players for lineups
SELECT 
    'TEAMS_WITH_ENOUGH_PLAYERS' as status,
    t.user_id,
    u.username,
    lg.name as league_name,
    array_length(t.player_ids, 1) as player_count,
    CASE 
        WHEN array_length(t.player_ids, 1) >= 5 THEN 'ENOUGH'
        ELSE 'NOT_ENOUGH'
    END as status
FROM teams t
JOIN users u ON t.user_id = u.id
JOIN leagues lg ON t.league_id = lg.id
ORDER BY array_length(t.player_ids, 1) DESC;

-- Step 3: Show current lineups and their issues
SELECT 
    'CURRENT_LINEUP_ISSUES' as status,
    l.id,
    l.user_id,
    u.username,
    lg.name as league_name,
    l.week_start_date,
    l.total_points,
    array_length(l.player_ids, 1) as current_player_count,
    CASE 
        WHEN array_length(l.player_ids, 1) < 5 THEN 'NEEDS_MORE_PLAYERS'
        ELSE 'CORRECT_COUNT'
    END as issue
FROM lineups l
JOIN users u ON l.user_id = u.id
JOIN leagues lg ON l.league_id = lg.id
WHERE l.week_start_date = '2025-07-21'
ORDER BY array_length(l.player_ids, 1);

-- Step 4: Fix lineups by adding more players from teams
DO $$
DECLARE
    lineup_record RECORD;
    team_record RECORD;
    auto_lineup_players UUID[];
    current_player_count INTEGER;
BEGIN
    RAISE NOTICE '=== FIXING LINEUPS WITH INSUFFICIENT PLAYERS ===';
    
    -- Loop through lineups that need more players
    FOR lineup_record IN 
        SELECT l.*, array_length(l.player_ids, 1) as current_count
        FROM lineups l
        WHERE l.week_start_date = '2025-07-21'
        AND array_length(l.player_ids, 1) < 5
    LOOP
        RAISE NOTICE 'Fixing lineup ID: % for user: %', lineup_record.id, lineup_record.user_id;
        
        -- Get the user's team
        SELECT * INTO team_record
        FROM teams
        WHERE user_id = lineup_record.user_id
          AND league_id = lineup_record.league_id;
        
        IF team_record IS NOT NULL AND array_length(team_record.player_ids, 1) >= 5 THEN
            -- Create a new lineup with 5 players
            auto_lineup_players := ARRAY(
                SELECT cp.id
                FROM chess_players cp
                WHERE cp.id = ANY(team_record.player_ids)
                ORDER BY 
                    CASE WHEN cp.accuracy IS NULL THEN 1 ELSE 0 END,
                    cp.accuracy ASC NULLS LAST
                LIMIT 5
            );
            
            RAISE NOTICE 'Creating new lineup with % players', array_length(auto_lineup_players, 1);
            
            -- Update the existing lineup with the correct players
            UPDATE lineups 
            SET player_ids = auto_lineup_players,
                updated_at = NOW()
            WHERE id = lineup_record.id;
            
            RAISE NOTICE 'Updated lineup with players: %', auto_lineup_players;
        ELSE
            RAISE NOTICE 'Team has insufficient players: %', 
                CASE WHEN team_record IS NULL THEN 'NO_TEAM' 
                     ELSE array_length(team_record.player_ids, 1)::TEXT || '_PLAYERS' 
                END;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== LINEUP FIXING COMPLETE ===';
END $$;

-- Step 5: Check fixed lineups
SELECT 
    'FIXED_LINEUPS' as status,
    l.id,
    l.user_id,
    u.username,
    lg.name as league_name,
    l.week_start_date,
    l.total_points,
    array_length(l.player_ids, 1) as player_count,
    l.player_ids
FROM lineups l
JOIN users u ON l.user_id = u.id
JOIN leagues lg ON l.league_id = lg.id
WHERE l.week_start_date = '2025-07-21'
ORDER BY array_length(l.player_ids, 1) DESC;

-- Step 6: Calculate points for the fixed lineups
DO $$
DECLARE
    lineup_record RECORD;
    calculated_points DECIMAL(10,2);
    player_ids UUID[];
    player_names TEXT[];
BEGIN
    RAISE NOTICE '=== CALCULATING POINTS FOR FIXED LINEUPS ===';
    
    -- Loop through all lineups for the week
    FOR lineup_record IN 
        SELECT * FROM lineups 
        WHERE week_start_date = '2025-07-21'
    LOOP
        player_ids := lineup_record.player_ids;
        
        -- Get player names for debugging
        SELECT array_agg(name) INTO player_names
        FROM chess_players
        WHERE id = ANY(player_ids);
        
        RAISE NOTICE 'Calculating points for lineup ID: %, Players: %', lineup_record.id, player_names;
        
        -- Calculate points
        WITH lineup_players AS (
            SELECT unnest(player_ids) AS player_id
        ),
        player_names_cte AS (
            SELECT lp.player_id, cp.name
            FROM lineup_players lp
            JOIN chess_players cp ON cp.id = lp.player_id
        ),
        player_points AS (
            SELECT
                COALESCE(SUM(
                    CASE
                        WHEN g.white = pn.name THEN g.white_points
                        WHEN g.black = pn.name THEN g.black_points
                        ELSE 0
                    END
                ), 0) AS player_total_points
            FROM player_names_cte pn
            LEFT JOIN games g ON (
                (g.date::DATE >= '2025-07-21' AND g.date::DATE <= '2025-07-27')
                AND (g.white = pn.name OR g.black = pn.name)
            )
        )
        SELECT SUM(player_total_points) INTO calculated_points
        FROM player_points;
        
        RAISE NOTICE 'Calculated points: %', calculated_points;
        
        -- Update the lineup with calculated points
        UPDATE lineups 
        SET total_points = calculated_points,
            updated_at = NOW()
        WHERE id = lineup_record.id;
        
        RAISE NOTICE 'Updated lineup with points: %', calculated_points;
    END LOOP;
    
    RAISE NOTICE '=== POINTS CALCULATION COMPLETE ===';
END $$;

-- Step 7: Show final results
SELECT 
    'FINAL_RESULTS' as status,
    l.id,
    l.user_id,
    u.username,
    lg.name as league_name,
    l.week_start_date,
    l.total_points,
    array_length(l.player_ids, 1) as player_count,
    l.player_ids
FROM lineups l
JOIN users u ON l.user_id = u.id
JOIN leagues lg ON l.league_id = lg.id
WHERE l.week_start_date = '2025-07-21'
ORDER BY l.total_points DESC;

-- Step 8: Summary
SELECT 
    'SUMMARY' as status,
    'Lineup fixing completed' as message,
    COUNT(*) as total_lineups,
    COUNT(CASE WHEN total_points > 0 THEN 1 END) as lineups_with_points,
    AVG(total_points) as average_points,
    MAX(total_points) as highest_points,
    MIN(total_points) as lowest_points
FROM lineups 
WHERE week_start_date = '2025-07-21'; 