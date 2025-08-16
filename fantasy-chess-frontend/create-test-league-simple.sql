-- Simple Test League Setup for Weekly Processing and Standings Bonus Testing

-- Step 1: Create test league
INSERT INTO leagues (
    id, name, description, is_public, buy_in, start_date, end_date, join_code, creator_id, 
    member_ids, draft_order, current_draft_turn, draft_completed, marketplace_started, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'Test League for Weekly Processing', 'Test league for weekly processing and standings bonus',
    true, 10, '2025-08-05', '2025-12-31', 'TEST001', 
    (SELECT id FROM users WHERE username = 'SacrificeTheQueen3'),
    ARRAY[(SELECT id FROM users WHERE username = 'SacrificeTheQueen3')],
    ARRAY[(SELECT id FROM users WHERE username = 'SacrificeTheQueen3')],
    0, true, true, NOW(), NOW()
);

-- Step 2: Create bot
INSERT INTO bots (id, name, league_id, created_at) 
VALUES (gen_random_uuid(), 'TestBot', 
        (SELECT id FROM leagues WHERE name = 'Test League for Weekly Processing'), NOW());

-- Step 3: Create teams with top 10 ELO players
-- First, create a temporary table with top 10 players
WITH top_players AS (
    SELECT id FROM chess_players 
    WHERE elo IS NOT NULL 
    ORDER BY elo DESC 
    LIMIT 10
)
INSERT INTO teams (id, user_id, league_id, player_ids, created_at, updated_at)
SELECT gen_random_uuid(), 
       (SELECT id FROM users WHERE username = 'SacrificeTheQueen3'),
       (SELECT id FROM leagues WHERE name = 'Test League for Weekly Processing'),
       (SELECT array_agg(id) FROM top_players),
       NOW(), NOW();

WITH top_players AS (
    SELECT id FROM chess_players 
    WHERE elo IS NOT NULL 
    ORDER BY elo DESC 
    LIMIT 10
)
INSERT INTO teams (id, bot_id, league_id, player_ids, created_at, updated_at)
SELECT gen_random_uuid(), 
       (SELECT id FROM bots WHERE name = 'TestBot'),
       (SELECT id FROM leagues WHERE name = 'Test League for Weekly Processing'),
       (SELECT array_agg(id) FROM top_players),
       NOW(), NOW();

-- Step 4: Create lineups
-- User lineup with first 5 players from top 10
WITH top_players AS (
    SELECT id FROM chess_players 
    WHERE elo IS NOT NULL 
    ORDER BY elo DESC 
    LIMIT 10
)
INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
SELECT (SELECT id FROM users WHERE username = 'SacrificeTheQueen3'),
       (SELECT id FROM leagues WHERE name = 'Test League for Weekly Processing'),
       '2025-08-05',
       (SELECT array_agg(id) FROM (SELECT id FROM top_players LIMIT 5) AS first_five),
       0, NOW(), NOW();

-- Bot lineup with last 5 players from top 10
WITH top_players AS (
    SELECT id FROM chess_players 
    WHERE elo IS NOT NULL 
    ORDER BY elo DESC 
    LIMIT 10
)
INSERT INTO lineups (bot_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
SELECT (SELECT id FROM bots WHERE name = 'TestBot'),
       (SELECT id FROM leagues WHERE name = 'Test League for Weekly Processing'),
       '2025-08-05',
       (SELECT array_agg(id) FROM (SELECT id FROM top_players OFFSET 5 LIMIT 5) AS last_five),
       0, NOW(), NOW();

-- Step 5: Create test games
WITH top_players AS (
    SELECT id, name FROM chess_players 
    WHERE elo IS NOT NULL 
    ORDER BY elo DESC 
    LIMIT 10
)
INSERT INTO games (id, date, white, black, white_points, black_points, early_late, result, white_accuracy, black_accuracy, round)
SELECT gen_random_uuid(), '2025.08.05', cp1.name, cp2.name, 
       CASE WHEN random() > 0.5 THEN 3 ELSE 1 END, CASE WHEN random() > 0.5 THEN 3 ELSE 1 END,
       'early', CASE WHEN random() > 0.5 THEN '1-0' ELSE '0-1' END,
       round((random() * 100)::numeric, 2), round((random() * 100)::numeric, 2), 1
FROM (SELECT id, name FROM top_players LIMIT 5) cp1
CROSS JOIN (SELECT id, name FROM top_players OFFSET 5 LIMIT 5) cp2
WHERE cp1.id != cp2.id
LIMIT 10;

-- Step 6: Set up coin balance
INSERT INTO coin_balances (user_id, balance, updated_at)
VALUES ((SELECT id FROM users WHERE username = 'SacrificeTheQueen3'), 100, NOW())
ON CONFLICT (user_id) DO UPDATE SET balance = 100, updated_at = NOW();

-- Step 7: Mark league as not payout processed (for standings bonus testing)
UPDATE leagues SET payout_processed = false WHERE name = 'Test League for Weekly Processing';

-- Verification
SELECT 'League created:' as status, name, start_date, end_date, draft_completed, marketplace_started, payout_processed
FROM leagues WHERE name = 'Test League for Weekly Processing';

SELECT 'Ready to test weekly processing with: SELECT process_weekly_results(''2025-08-05''::date);' as instruction;
SELECT 'Ready to test standings bonus with: SELECT award_standings_bonus_points();' as instruction;
