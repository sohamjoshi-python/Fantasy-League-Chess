-- ========================================
-- TEST WEEKLY POINTS SYSTEM V2
-- Apply fixed function and test weekly results
-- ========================================

-- Step 1: Apply the fixed weekly results function
-- (This replaces the function that only looked at Monday games)

CREATE OR REPLACE FUNCTION public.process_weekly_results_enhanced(week_date DATE)
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
    member RECORD;
    lineup_record RECORD;
    team RECORD;
    auto_lineup_players UUID[];
    player_ids UUID[];
    player_names TEXT[];
    calculated_points DECIMAL(10,2);
    week_end_date DATE;
    current_date DATE;
    formatted_date TEXT;
BEGIN
    -- Calculate the end of the week (Sunday)
    week_end_date := week_date + INTERVAL '6 days';
    
    -- Debug: Show the date range being processed
    RAISE NOTICE 'Processing week from % to %', week_date, week_end_date;

    -- Loop through all active leagues
    FOR league_record IN 
        SELECT * FROM public.leagues 
        WHERE start_date <= week_date AND end_date >= week_date
    LOOP
        RAISE NOTICE 'Processing league: %', league_record.name;
        
        -- Loop through all league members
        FOR member IN 
            SELECT * FROM public.league_members WHERE league_id = league_record.id
        LOOP
            -- Get user's lineup for the week
            SELECT * INTO lineup_record 
            FROM public.lineups 
            WHERE user_id = member.user_id 
              AND league_id = league_record.id 
              AND week_start_date = week_date;

            -- If no lineup exists, create one automatically with lowest accuracy players
            IF lineup_record IS NULL THEN
                RAISE NOTICE 'Creating auto-lineup for user % in league %', member.user_id, league_record.name;
                
                -- Get user's team
                SELECT * INTO team
                FROM public.teams
                WHERE user_id = member.user_id
                  AND league_id = league_record.id;

                IF team.player_ids IS NOT NULL AND array_length(team.player_ids, 1) >= 5 THEN
                    auto_lineup_players := ARRAY(
                        SELECT cp.id
                        FROM public.chess_players cp
                        WHERE cp.id = ANY(team.player_ids)
                        ORDER BY 
                            CASE WHEN cp.accuracy IS NULL THEN 1 ELSE 0 END,
                            cp.accuracy ASC NULLS LAST
                        LIMIT 5
                    );

                    -- Insert the auto-created lineup
                    INSERT INTO public.lineups (user_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
                    VALUES (member.user_id, league_record.id, week_date, auto_lineup_players, 0, NOW(), NOW());

                    -- Fetch the newly created lineup
                    SELECT * INTO lineup_record 
                    FROM public.lineups 
                    WHERE user_id = member.user_id 
                      AND league_id = league_record.id 
                      AND week_start_date = week_date;
                END IF;
            END IF;

            -- If lineup exists (either user-set or auto-created), sum points from games
            IF lineup_record IS NOT NULL THEN
                player_ids := lineup_record.player_ids;

                -- Get the names of the players in the lineup
                SELECT array_agg(name) INTO player_names
                FROM public.chess_players
                WHERE id = ANY(player_ids);

                -- Debug: Show which players are being processed
                RAISE NOTICE 'Processing lineup for user %: player_ids %, player_names %', member.user_id, player_ids, player_names;

                -- Calculate points by looking for games throughout the entire week
                WITH lineup_players AS (
                    SELECT unnest(player_ids) AS player_id
                ),
                player_names_cte AS (
                    SELECT lp.player_id, cp.name
                    FROM lineup_players lp
                    JOIN public.chess_players cp ON cp.id = lp.player_id
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
                    LEFT JOIN public.games g ON (
                        -- Convert game date string to date and check if it's within the week
                        (g.date::DATE >= week_date AND g.date::DATE <= week_end_date)
                        AND (g.white = pn.name OR g.black = pn.name)
                    )
                )
                SELECT SUM(player_total_points) INTO calculated_points
                FROM player_points;

                -- Debug: Show the total points calculated
                RAISE NOTICE 'Total points for user % for week %-%: %', 
                    member.user_id, week_date, week_end_date, calculated_points;

                -- Update lineup with calculated points
                UPDATE public.lineups 
                SET total_points = calculated_points,
                    updated_at = NOW()
                WHERE id = lineup_record.id;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Show current league information
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

-- Step 3: Update league start date to last week (for testing)
UPDATE leagues 
SET 
    start_date = '2025-07-14'::DATE,  -- Last Monday
    end_date = '2025-08-11'::DATE     -- 4 weeks from start
WHERE name LIKE '%Dev League%' OR name LIKE '%Test%' OR name LIKE '%League%'
AND start_date > CURRENT_DATE;

-- Step 4: Show updated league information
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

-- Step 5: Check if there are any games in the database for the week (July 14-20)
SELECT 
    'GAMES_CHECK' as status,
    COUNT(*) as total_games,
    MIN(date) as earliest_game,
    MAX(date) as latest_game
FROM games;

-- Step 6: Show sample games from the week (July 14-20)
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

-- Step 7: Check current lineups before processing
SELECT 
    'LINEUPS_BEFORE' as status,
    COUNT(*) as total_lineups,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT league_id) as unique_leagues
FROM lineups;

-- Step 8: Show sample lineups before processing
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

-- Step 9: Run the fixed weekly results function for last week
SELECT 
    'RUNNING_FIXED_WEEKLY_FUNCTION' as status,
    'Processing week starting 2025-07-14 (Monday) to 2025-07-20 (Sunday)' as message;

-- Call the function
SELECT process_weekly_results_enhanced('2025-07-14'::DATE);

-- Step 10: Check lineups after processing
SELECT 
    'LINEUPS_AFTER' as status,
    COUNT(*) as total_lineups,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT league_id) as unique_leagues
FROM lineups;

-- Step 11: Show updated lineups with points
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

-- Step 12: Show detailed breakdown for lineups with points
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

-- Step 13: Check if any games were found for the players in lineups
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

-- Step 14: Summary of results
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

-- Step 15: Reset league dates back to original (optional)
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