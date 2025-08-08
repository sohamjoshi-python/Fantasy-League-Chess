-- Simple test league setup - Step by step (FIXED TYPES)
-- Run this in your Supabase SQL Editor

-- Step 1: Create the test league
INSERT INTO leagues (
    id,
    name,
    description,
    is_public,
    buy_in,
    start_date,
    end_date,
    join_code,
    creator_id,
    member_ids,
    draft_order,
    current_draft_turn,
    draft_completed,
    marketplace_started,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'Test League for Weekly Processing',
    'Test league for weekly processing and bot lineup testing',
    true,
    10,
    '2025-07-15',
    '2025-12-31',
    'TEST001',
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid,
    ARRAY['4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid],
    ARRAY['4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid],
    0,
    true,
    true,
    NOW(),
    NOW()
);

-- Step 2: Create a bot
INSERT INTO bots (
    id,
    name,
    league_id,
    created_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440017'::uuid,
    'TestBot',
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    NOW()
);

-- Step 3: Add bot to league member_ids
UPDATE leagues 
SET member_ids = ARRAY['4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid, '550e8400-e29b-41d4-a716-446655440017'::uuid]
WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

-- Step 4: Add chess players
INSERT INTO chess_players (
    id,
    name,
    elo,
    accuracy,
    created_at,
    updated_at
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Magnus Carlsen', 2830, 95.5, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Hikaru Nakamura', 2780, 94.2, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Fabiano Caruana', 2804, 93.8, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'Ding Liren', 2780, 92.1, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'Alireza Firouzja', 2759, 91.5, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440006'::uuid, 'Ian Nepomniachtchi', 2758, 90.8, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440007'::uuid, 'Wesley So', 2750, 89.3, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440008'::uuid, 'Anish Giri', 2747, 88.7, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440009'::uuid, 'Levon Aronian', 2782, 94.5, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440010'::uuid, 'Maxime Vachier-Lagrave', 2766, 93.1, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440011'::uuid, 'Richard Rapport', 2743, 92.8, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440012'::uuid, 'Teimour Radjabov', 2758, 91.9, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440013'::uuid, 'Shakhriyar Mamedyarov', 2757, 90.4, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440014'::uuid, 'Peter Svidler', 2745, 89.6, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440015'::uuid, 'Alexander Grischuk', 2758, 88.9, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440016'::uuid, 'Sergey Karjakin', 2750, 87.2, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    elo = EXCLUDED.elo,
    accuracy = EXCLUDED.accuracy,
    updated_at = NOW();

-- Step 5: Create user's team
INSERT INTO teams (
    user_id,
    league_id,
    player_ids,
    created_at,
    updated_at
) VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    ARRAY[
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        '550e8400-e29b-41d4-a716-446655440003'::uuid,
        '550e8400-e29b-41d4-a716-446655440004'::uuid,
        '550e8400-e29b-41d4-a716-446655440005'::uuid,
        '550e8400-e29b-41d4-a716-446655440006'::uuid,
        '550e8400-e29b-41d4-a716-446655440007'::uuid,
        '550e8400-e29b-41d4-a716-446655440008'::uuid
    ],
    NOW(),
    NOW()
);

-- Step 6: Create bot's team
INSERT INTO teams (
    bot_id,
    league_id,
    player_ids,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440017'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    ARRAY[
        '550e8400-e29b-41d4-a716-446655440009'::uuid,
        '550e8400-e29b-41d4-a716-446655440010'::uuid,
        '550e8400-e29b-41d4-a716-446655440011'::uuid,
        '550e8400-e29b-41d4-a716-446655440012'::uuid,
        '550e8400-e29b-41d4-a716-446655440013'::uuid,
        '550e8400-e29b-41d4-a716-446655440014'::uuid,
        '550e8400-e29b-41d4-a716-446655440015'::uuid,
        '550e8400-e29b-41d4-a716-446655440016'::uuid
    ],
    NOW(),
    NOW()
);

-- Step 7: Add coin balances
INSERT INTO league_coin_balances (
    user_id,
    league_id,
    coin_balance,
    created_at,
    updated_at
) VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
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
    '550e8400-e29b-41d4-a716-446655440017'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    50,
    NOW(),
    NOW()
);

-- Step 8: Add sample games
INSERT INTO games (
    id,
    early_late,
    date,
    white,
    black,
    result,
    white_accuracy,
    black_accuracy,
    round,
    white_points,
    black_points,
    created_at
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440018'::uuid, 'Early', '2025-07-15', 'Magnus Carlsen', 'Hikaru Nakamura', '1-0', 95.5, 94.2, '1', 3, 1, NOW()),
    ('550e8400-e29b-41d4-a716-446655440019'::uuid, 'Early', '2025-07-15', 'Fabiano Caruana', 'Ding Liren', '1/2-1/2', 93.8, 92.1, '2', 2, 2, NOW()),
    ('550e8400-e29b-41d4-a716-446655440020'::uuid, 'Early', '2025-07-15', 'Alireza Firouzja', 'Ian Nepomniachtchi', '0-1', 91.5, 90.8, '3', 1, 3, NOW()),
    ('550e8400-e29b-41d4-a716-446655440021'::uuid, 'Early', '2025-07-15', 'Wesley So', 'Anish Giri', '1-0', 89.3, 88.7, '4', 2.5, 1.5, NOW()),
    ('550e8400-e29b-41d4-a716-446655440022'::uuid, 'Early', '2025-07-15', 'Levon Aronian', 'Maxime Vachier-Lagrave', '1-0', 94.5, 93.1, '5', 3, 1, NOW()),
    ('550e8400-e29b-41d4-a716-446655440023'::uuid, 'Early', '2025-07-15', 'Richard Rapport', 'Teimour Radjabov', '0-1', 92.8, 91.9, '6', 1, 3, NOW()),
    ('550e8400-e29b-41d4-a716-446655440024'::uuid, 'Early', '2025-07-15', 'Shakhriyar Mamedyarov', 'Peter Svidler', '1/2-1/2', 90.4, 89.6, '7', 2, 2, NOW()),
    ('550e8400-e29b-41d4-a716-446655440025'::uuid, 'Early', '2025-07-15', 'Alexander Grischuk', 'Sergey Karjakin', '1-0', 88.9, 87.2, '8', 2.5, 1.5, NOW())
ON CONFLICT (id) DO UPDATE SET
    early_late = EXCLUDED.early_late,
    date = EXCLUDED.date,
    white = EXCLUDED.white,
    black = EXCLUDED.black,
    result = EXCLUDED.result,
    white_accuracy = EXCLUDED.white_accuracy,
    black_accuracy = EXCLUDED.black_accuracy,
    round = EXCLUDED.round,
    white_points = EXCLUDED.white_points,
    black_points = EXCLUDED.black_points;

-- Step 9: Create lineups manually
INSERT INTO lineups (
    user_id,
    league_id,
    week_start_date,
    player_ids,
    total_points,
    created_at,
    updated_at
) VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    '2025-07-15',
    ARRAY[
        '550e8400-e29b-41d4-a716-446655440008'::uuid,
        '550e8400-e29b-41d4-a716-446655440007'::uuid,
        '550e8400-e29b-41d4-a716-446655440006'::uuid,
        '550e8400-e29b-41d4-a716-446655440005'::uuid,
        '550e8400-e29b-41d4-a716-446655440004'::uuid
    ],
    0,
    NOW(),
    NOW()
);

INSERT INTO lineups (
    bot_id,
    league_id,
    week_start_date,
    player_ids,
    total_points,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440017'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    '2025-07-15',
    ARRAY[
        '550e8400-e29b-41d4-a716-446655440009'::uuid,
        '550e8400-e29b-41d4-a716-446655440010'::uuid,
        '550e8400-e29b-41d4-a716-446655440011'::uuid,
        '550e8400-e29b-41d4-a716-446655440012'::uuid,
        '550e8400-e29b-41d4-a716-446655440013'::uuid
    ],
    0,
    NOW(),
    NOW()
);

-- Step 10: Verify the setup
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
LEFT JOIN teams t1 ON t1.user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid AND t1.league_id = l.id
LEFT JOIN teams t2 ON t2.bot_id = b.id AND t2.league_id = l.id
LEFT JOIN league_coin_balances lcb1 ON lcb1.user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid AND lcb1.league_id = l.id
LEFT JOIN league_coin_balances lcb2 ON lcb2.bot_id = b.id AND lcb2.league_id = l.id
WHERE l.id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

-- Step 11: Show the lineups (FIXED TYPE CASTING)
SELECT 
    'User Lineup' as lineup_type,
    u.username,
    l.week_start_date,
    array_agg(cp.name ORDER BY cp.accuracy ASC) as players,
    l.total_points
FROM lineups l
JOIN users u ON l.user_id = u.id
JOIN chess_players cp ON cp.id::text = ANY(l.player_ids)
WHERE l.user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid AND l.league_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
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
JOIN chess_players cp ON cp.id::text = ANY(l.player_ids)
WHERE l.bot_id = '550e8400-e29b-41d4-a716-446655440017'::uuid AND l.league_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
GROUP BY b.name, l.week_start_date, l.total_points;
