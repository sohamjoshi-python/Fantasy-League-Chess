-- Create a test league with user, bot, players, and automatic lineup selection
-- This script sets up everything needed to test the weekly processing

-- 1. Create the test league
INSERT INTO leagues (
    id,
    name,
    creator_id,
    member_ids,
    start_date,
    end_date,
    marketplace_started,
    draft_completed,
    created_at,
    updated_at
) VALUES (
    'test-league-001',
    'Test League for Weekly Processing',
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425',
    ARRAY['4a6364e1-426c-4c37-9fe3-b3eab4cf1425'],
    '2025-07-15', -- Past start date (Tuesday)
    '2025-12-31',
    true,
    true,
    NOW(),
    NOW()
);

-- 2. Create a bot for the test league
INSERT INTO bots (
    id,
    name,
    league_id,
    created_at,
    updated_at
) VALUES (
    'test-bot-001',
    'TestBot',
    'test-league-001',
    NOW(),
    NOW()
);

-- 3. Add bot to league member_ids
UPDATE leagues 
SET member_ids = ARRAY['4a6364e1-426c-4c37-9fe3-b3eab4cf1425', 'test-bot-001']
WHERE id = 'test-league-001';

-- 4. Create user's team with some random players
INSERT INTO teams (
    user_id,
    league_id,
    player_ids,
    created_at,
    updated_at
) VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425',
    'test-league-001',
    ARRAY[
        '550e8400-e29b-41d4-a716-446655440001', -- Magnus Carlsen
        '550e8400-e29b-41d4-a716-446655440002', -- Hikaru Nakamura
        '550e8400-e29b-41d4-a716-446655440003', -- Fabiano Caruana
        '550e8400-e29b-41d4-a716-446655440004', -- Ding Liren
        '550e8400-e29b-41d4-a716-446655440005', -- Alireza Firouzja
        '550e8400-e29b-41d4-a716-446655440006', -- Ian Nepomniachtchi
        '550e8400-e29b-41d4-a716-446655440007', -- Wesley So
        '550e8400-e29b-41d4-a716-446655440008'  -- Anish Giri
    ],
    NOW(),
    NOW()
);

-- 5. Create bot's team with some random players
INSERT INTO teams (
    bot_id,
    league_id,
    player_ids,
    created_at,
    updated_at
) VALUES (
    'test-bot-001',
    'test-league-001',
    ARRAY[
        '550e8400-e29b-41d4-a716-446655440009', -- Levon Aronian
        '550e8400-e29b-41d4-a716-446655440010', -- Maxime Vachier-Lagrave
        '550e8400-e29b-41d4-a716-446655440011', -- Richard Rapport
        '550e8400-e29b-41d4-a716-446655440012', -- Teimour Radjabov
        '550e8400-e29b-41d4-a716-446655440013', -- Shakhriyar Mamedyarov
        '550e8400-e29b-41d4-a716-446655440014', -- Peter Svidler
        '550e8400-e29b-41d4-a716-446655440015', -- Alexander Grischuk
        '550e8400-e29b-41d4-a716-446655440016'  -- Sergey Karjakin
    ],
    NOW(),
    NOW()
);

-- 6. Add some sample chess players with accuracy data
INSERT INTO chess_players (
    id,
    name,
    elo,
    accuracy,
    created_at,
    updated_at
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Magnus Carlsen', 2830, 95.5, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'Hikaru Nakamura', 2780, 94.2, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'Fabiano Caruana', 2804, 93.8, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440004', 'Ding Liren', 2780, 92.1, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440005', 'Alireza Firouzja', 2759, 91.5, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440006', 'Ian Nepomniachtchi', 2758, 90.8, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440007', 'Wesley So', 2750, 89.3, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440008', 'Anish Giri', 2747, 88.7, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440009', 'Levon Aronian', 2782, 94.5, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440010', 'Maxime Vachier-Lagrave', 2766, 93.1, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440011', 'Richard Rapport', 2743, 92.8, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440012', 'Teimour Radjabov', 2758, 91.9, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440013', 'Shakhriyar Mamedyarov', 2757, 90.4, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440014', 'Peter Svidler', 2745, 89.6, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440015', 'Alexander Grischuk', 2758, 88.9, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440016', 'Sergey Karjakin', 2750, 87.2, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    elo = EXCLUDED.elo,
    accuracy = EXCLUDED.accuracy,
    updated_at = NOW();

-- 7. Add coin balances for user and bot
INSERT INTO league_coin_balances (
    user_id,
    league_id,
    coin_balance,
    created_at,
    updated_at
) VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425',
    'test-league-001',
    50,
    NOW(),
    NOW()
);

INSERT INTO league_coin_balances (
    bot_id,
    league_id,
    coin_balance,
    created_at,
    updated_at
) VALUES (
    'test-bot-001',
    'test-league-001',
    50,
    NOW(),
    NOW()
);

-- 8. Add some sample games for the test date (2025-07-15 - Tuesday)
INSERT INTO games (
    id,
    date,
    white,
    black,
    white_points,
    black_points,
    created_at,
    updated_at
) VALUES 
    ('game-001', '2025-07-15', 'Magnus Carlsen', 'Hikaru Nakamura', 3, 1, NOW(), NOW()),
    ('game-002', '2025-07-15', 'Fabiano Caruana', 'Ding Liren', 2, 2, NOW(), NOW()),
    ('game-003', '2025-07-15', 'Alireza Firouzja', 'Ian Nepomniachtchi', 1, 3, NOW(), NOW()),
    ('game-004', '2025-07-15', 'Wesley So', 'Anish Giri', 2.5, 1.5, NOW(), NOW()),
    ('game-005', '2025-07-15', 'Levon Aronian', 'Maxime Vachier-Lagrave', 3, 1, NOW(), NOW()),
    ('game-006', '2025-07-15', 'Richard Rapport', 'Teimour Radjabov', 1, 3, NOW(), NOW()),
    ('game-007', '2025-07-15', 'Shakhriyar Mamedyarov', 'Peter Svidler', 2, 2, NOW(), NOW()),
    ('game-008', '2025-07-15', 'Alexander Grischuk', 'Sergey Karjakin', 2.5, 1.5, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    date = EXCLUDED.date,
    white = EXCLUDED.white,
    black = EXCLUDED.black,
    white_points = EXCLUDED.white_points,
    black_points = EXCLUDED.black_points,
    updated_at = NOW();

-- 9. Manually trigger bot lineup creation for the test week
SELECT public.auto_set_bot_lineup('test-bot-001', 'test-league-001');

-- 10. Create a manual lineup for the user (worst 5 players)
INSERT INTO lineups (
    user_id,
    league_id,
    week_start_date,
    player_ids,
    total_points,
    created_at,
    updated_at
) VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425',
    'test-league-001',
    '2025-07-15',
    ARRAY[
        '550e8400-e29b-41d4-a716-446655440008', -- Anish Giri (worst)
        '550e8400-e29b-41d4-a716-446655440007', -- Wesley So
        '550e8400-e29b-41d4-a716-446655440006', -- Ian Nepomniachtchi
        '550e8400-e29b-41d4-a716-446655440005', -- Alireza Firouzja
        '550e8400-e29b-41d4-a716-446655440004'  -- Ding Liren
    ],
    0,
    NOW(),
    NOW()
);

-- 11. Verify the setup
SELECT 
    'Test League Setup Complete' as status,
    l.name as league_name,
    l.start_date,
    l.member_ids,
    b.name as bot_name,
    array_length(t1.player_ids, 1) as user_players,
    array_length(t2.player_ids, 1) as bot_players,
    lcb1.coin_balance as user_coins,
    lcb2.coin_balance as bot_coins
FROM leagues l
LEFT JOIN bots b ON b.league_id = l.id
LEFT JOIN teams t1 ON t1.user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425' AND t1.league_id = l.id
LEFT JOIN teams t2 ON t2.bot_id = b.id AND t2.league_id = l.id
LEFT JOIN league_coin_balances lcb1 ON lcb1.user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425' AND lcb1.league_id = l.id
LEFT JOIN league_coin_balances lcb2 ON lcb2.bot_id = b.id AND lcb2.league_id = l.id
WHERE l.id = 'test-league-001';

-- 12. Show the lineups
SELECT 
    'User Lineup' as lineup_type,
    u.username,
    l.week_start_date,
    array_agg(cp.name ORDER BY cp.accuracy ASC) as players,
    l.total_points
FROM lineups l
JOIN users u ON l.user_id = u.id
JOIN chess_players cp ON cp.id = ANY(l.player_ids)
WHERE l.user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425' AND l.league_id = 'test-league-001'
GROUP BY u.username, l.week_start_date, l.total_points

UNION ALL

SELECT 
    'Bot Lineup' as lineup_type,
    b.name as username,
    l.week_start_date,
    array_agg(cp.name ORDER BY cp.accuracy DESC) as players,
    l.total_points
FROM lineups l
JOIN bots b ON l.bot_id = b.id
JOIN chess_players cp ON cp.id = ANY(l.player_ids)
WHERE l.bot_id = 'test-bot-001' AND l.league_id = 'test-league-001'
GROUP BY b.name, l.week_start_date, l.total_points;

-- 13. Test the weekly processing function
SELECT public.process_weekly_results('2025-07-15');

-- 14. Show results after processing
SELECT 
    'Results After Processing' as status,
    l.week_start_date,
    CASE 
        WHEN l.user_id IS NOT NULL THEN 'User: ' || u.username
        WHEN l.bot_id IS NOT NULL THEN 'Bot: ' || b.name
    END as participant,
    l.total_points,
    array_agg(cp.name ORDER BY cp.accuracy) as lineup_players
FROM lineups l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN bots b ON l.bot_id = b.id
LEFT JOIN chess_players cp ON cp.id = ANY(l.player_ids)
WHERE l.league_id = 'test-league-001' AND l.week_start_date = '2025-07-15'
GROUP BY l.week_start_date, l.user_id, l.bot_id, u.username, b.name, l.total_points
ORDER BY l.total_points DESC;
