-- ========================================
-- DEBUG LINEUP POINTS
-- Figure out why lineups show 0.00 points despite players having games
-- ========================================

-- Step 1: Check current lineup points
SELECT 
    'CURRENT_LINEUP_POINTS' as status,
    l.id,
    l.user_id,
    u.username,
    l.league_id,
    lg.name as league_name,
    l.week_start_date,
    l.total_points,
    l.player_ids,
    array_length(l.player_ids, 1) as player_count
FROM lineups l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN leagues lg ON l.league_id = lg.id
WHERE l.week_start_date = '2025-07-21'
ORDER BY l.total_points DESC;

-- Step 2: Manually calculate what the points should be for each lineup
WITH lineup_players AS (
    SELECT 
        l.id as lineup_id,
        l.user_id,
        l.league_id,
        l.week_start_date,
        unnest(l.player_ids) as player_id
    FROM lineups l
    WHERE l.week_start_date = '2025-07-21'
),
player_games AS (
    SELECT 
        lp.lineup_id,
        lp.user_id,
        lp.league_id,
        cp.name as player_name,
        COUNT(g.id) as game_count,
        COALESCE(SUM(
            CASE
                WHEN g.white = cp.name THEN g.white_points
                WHEN g.black = cp.name THEN g.black_points
                ELSE 0
            END
        ), 0) as player_points
    FROM lineup_players lp
    JOIN chess_players cp ON cp.id = lp.player_id
    LEFT JOIN games g ON (
        (g.white = cp.name OR g.black = cp.name)
        AND g.date::DATE >= '2025-07-21' 
        AND g.date::DATE <= '2025-07-27'
    )
    GROUP BY lp.lineup_id, lp.user_id, lp.league_id, cp.id, cp.name
)
SELECT 
    'MANUAL_CALCULATION' as status,
    pg.lineup_id,
    u.username,
    pg.player_name,
    pg.game_count,
    pg.player_points
FROM player_games pg
JOIN users u ON pg.user_id = u.id
ORDER BY pg.player_points DESC;

-- Step 3: Calculate total points per lineup manually
WITH lineup_players AS (
    SELECT 
        l.id as lineup_id,
        l.user_id,
        l.league_id,
        l.week_start_date,
        unnest(l.player_ids) as player_id
    FROM lineups l
    WHERE l.week_start_date = '2025-07-21'
),
lineup_totals AS (
    SELECT 
        lp.lineup_id,
        lp.user_id,
        lp.league_id,
        COALESCE(SUM(
            CASE
                WHEN g.white = cp.name THEN g.white_points
                WHEN g.black = cp.name THEN g.black_points
                ELSE 0
            END
        ), 0) as calculated_total_points
    FROM lineup_players lp
    JOIN chess_players cp ON cp.id = lp.player_id
    LEFT JOIN games g ON (
        (g.white = cp.name OR g.black = cp.name)
        AND g.date::DATE >= '2025-07-21' 
        AND g.date::DATE <= '2025-07-27'
    )
    GROUP BY lp.lineup_id, lp.user_id, lp.league_id
)
SELECT 
    'LINEUP_TOTALS_COMPARISON' as status,
    lt.lineup_id,
    u.username,
    lg.name as league_name,
    l.total_points as current_points,
    lt.calculated_total_points as should_be_points,
    CASE 
        WHEN l.total_points = lt.calculated_total_points THEN 'MATCH'
        ELSE 'MISMATCH'
    END as status
FROM lineup_totals lt
JOIN lineups l ON l.id = lt.lineup_id
JOIN users u ON lt.user_id = u.id
JOIN leagues lg ON lt.league_id = lg.id
ORDER BY lt.calculated_total_points DESC;

-- Step 4: Test the function update logic manually
DO $$
DECLARE
    lineup_record RECORD;
    calculated_points DECIMAL(10,2);
    player_ids UUID[];
    player_names TEXT[];
BEGIN
    RAISE NOTICE '=== TESTING MANUAL UPDATE LOGIC ===';
    
    -- Get the first lineup
    SELECT * INTO lineup_record 
    FROM lineups 
    WHERE week_start_date = '2025-07-21'
    LIMIT 1;
    
    IF lineup_record IS NOT NULL THEN
        player_ids := lineup_record.player_ids;
        
        -- Get player names
        SELECT array_agg(name) INTO player_names
        FROM chess_players
        WHERE id = ANY(player_ids);
        
        RAISE NOTICE 'Testing lineup ID: %, Players: %', lineup_record.id, player_names;
        
        -- Calculate points manually
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
        
        -- Update the lineup manually
        UPDATE lineups 
        SET total_points = calculated_points,
            updated_at = NOW()
        WHERE id = lineup_record.id;
        
        RAISE NOTICE 'Updated lineup with points: %', calculated_points;
    ELSE
        RAISE NOTICE 'No lineups found for week 2025-07-21';
    END IF;
    
    RAISE NOTICE '=== MANUAL UPDATE TEST COMPLETE ===';
END $$;

-- Step 5: Check if the manual update worked
SELECT 
    'AFTER_MANUAL_UPDATE' as status,
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
WHERE l.week_start_date = '2025-07-21'
ORDER BY l.total_points DESC; 