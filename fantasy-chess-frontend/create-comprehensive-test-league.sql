-- Comprehensive Test League Setup
-- This script creates a complete test environment for weekly processing and standings bonus

-- Step 1: Get the user ID for SacrificeTheQueen3
DO $$
DECLARE
    target_user_id UUID;
    test_league_id UUID := gen_random_uuid();
    bot_id UUID := gen_random_uuid();
    top_players UUID[];
    user_team_id UUID := gen_random_uuid();
    bot_team_id UUID := gen_random_uuid();
    league_start_date DATE := '2025-08-05'; -- Tuesday before 8/12/2025
    league_end_date DATE := '2025-12-31';
BEGIN
    -- Get user ID for SacrificeTheQueen3
    SELECT id INTO target_user_id FROM users WHERE username = 'SacrificeTheQueen3';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User SacrificeTheQueen3 not found. Please check the username.';
    END IF;
    
    RAISE NOTICE 'Setting up test league for user: % (ID: %)', 'SacrificeTheQueen3', target_user_id;
    
    -- Step 2: Create the test league
    INSERT INTO leagues (
        id, name, description, is_public, buy_in, start_date, end_date, join_code, creator_id, 
        member_ids, draft_order, current_draft_turn, draft_completed, marketplace_started, created_at, updated_at
    ) VALUES (
        test_league_id, 'Comprehensive Test League for Weekly Processing', 
        'Test league for comprehensive testing of weekly processing and standings bonus',
        true, 10, league_start_date, league_end_date, 'COMP001', target_user_id,
        ARRAY[target_user_id], ARRAY[target_user_id], 0, true, true, NOW(), NOW()
    );
    
    -- Step 3: Create bot
    INSERT INTO bots (id, name, league_id, created_at) 
    VALUES (bot_id, 'TestBot', test_league_id, NOW());
    
    -- Step 4: Get top 10 players by ELO
    SELECT array_agg(id ORDER BY elo DESC NULLS LAST) INTO top_players
    FROM chess_players WHERE elo IS NOT NULL ORDER BY elo DESC LIMIT 10;
    
    -- Step 5: Create user team with top 10 players
    INSERT INTO teams (id, user_id, league_id, player_ids, created_at, updated_at)
    VALUES (user_team_id, target_user_id, test_league_id, top_players, NOW(), NOW());
    
    -- Step 6: Create bot team with top 10 players
    INSERT INTO teams (id, bot_id, league_id, player_ids, created_at, updated_at)
    VALUES (bot_team_id, bot_id, test_league_id, top_players, NOW(), NOW());
    
    -- Step 7: Create random lineups for the user (5 players randomly selected from top 10)
    INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
    VALUES (target_user_id, test_league_id, league_start_date, 
            ARRAY[top_players[1], top_players[3], top_players[5], top_players[7], top_players[9]], 0, NOW(), NOW());
    
    -- Step 8: Create random lineup for the bot (5 players randomly selected from top 10)
    INSERT INTO lineups (bot_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
    VALUES (bot_id, test_league_id, league_start_date, 
            ARRAY[top_players[2], top_players[4], top_players[6], top_players[8], top_players[10]], 0, NOW(), NOW());
    
    -- Step 9: Create test games for the week (using player names from top 10)
    INSERT INTO games (id, date, white, black, white_points, black_points, early_late, result, white_accuracy, black_accuracy, round)
    SELECT gen_random_uuid(), '2025.08.05', cp1.name, cp2.name, 
           CASE WHEN random() > 0.5 THEN 3 ELSE 1 END, CASE WHEN random() > 0.5 THEN 3 ELSE 1 END,
           'early', CASE WHEN random() > 0.5 THEN '1-0' ELSE '0-1' END,
           round((random() * 100)::numeric, 2), round((random() * 100)::numeric, 2), 1
    FROM chess_players cp1 CROSS JOIN chess_players cp2
    WHERE cp1.id = ANY(top_players[1:5]) AND cp2.id = ANY(top_players[6:10]) AND cp1.id != cp2.id
    LIMIT 10;
    
    -- Step 10: Set up coin balances
    INSERT INTO coin_balances (user_id, balance, updated_at)
    VALUES (target_user_id, 100, NOW())
    ON CONFLICT (user_id) DO UPDATE SET balance = 100, updated_at = NOW();
    
    -- Step 11: Mark league as payout_processed = false (so it can receive standings bonus later)
    UPDATE leagues SET payout_processed = false WHERE id = test_league_id;
    
    RAISE NOTICE 'Test league setup completed successfully! League ID: %', test_league_id;
END $$;

-- Verification queries
SELECT 'League Info' as info_type, l.id, l.name, l.start_date, l.end_date, l.draft_completed, l.marketplace_started, l.payout_processed
FROM leagues l WHERE l.name = 'Comprehensive Test League for Weekly Processing';

SELECT 'User Team' as info_type, t.id, t.user_id, array_length(t.player_ids, 1) as player_count
FROM teams t JOIN leagues l ON t.league_id = l.id
WHERE l.name = 'Comprehensive Test League for Weekly Processing' AND t.user_id IS NOT NULL;

SELECT 'Bot Team' as info_type, t.id, t.bot_id, array_length(t.player_ids, 1) as player_count
FROM teams t JOIN leagues l ON t.league_id = l.id
WHERE l.name = 'Comprehensive Test League for Weekly Processing' AND t.bot_id IS NOT NULL;

SELECT 'User Lineup' as info_type, l.id, l.user_id, l.week_start_date, array_length(l.player_ids, 1) as player_count, l.total_points
FROM lineups l JOIN leagues lg ON l.league_id = lg.id
WHERE lg.name = 'Comprehensive Test League for Weekly Processing' AND l.user_id IS NOT NULL;

SELECT 'Bot Lineup' as info_type, l.id, l.bot_id, l.week_start_date, array_length(l.player_ids, 1) as player_count, l.total_points
FROM lineups l JOIN leagues lg ON l.league_id = lg.id
WHERE lg.name = 'Comprehensive Test League for Weekly Processing' AND l.bot_id IS NOT NULL;

SELECT 'Games Created' as info_type, COUNT(*) as game_count, MIN(date) as earliest_game, MAX(date) as latest_game
FROM games g WHERE g.date = '2025.08.05';

-- Test instructions
SELECT 'Testing Weekly Processing' as test_type, 'Ready to run: SELECT process_weekly_results(''2025-08-05''::date);' as instruction;
SELECT 'Testing Standings Bonus' as test_type, 'Ready to run: SELECT award_standings_bonus_points();' as instruction;
