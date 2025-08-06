-- Reset bot coin balance to 50 coins
-- This fixes the issue where bots had unlimited coins

-- Step 1: Check the actual structure of league_coin_balances table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'league_coin_balances' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Reset all bot coin balances to 50 (using user_id field for bots)
UPDATE league_coin_balances 
SET coin_balance = 50, updated_at = NOW()
WHERE user_id IN (SELECT id FROM bots);

-- Step 3: Show current bot coin balances
SELECT 
    b.id as bot_id,
    b.name as bot_name,
    b.league_id,
    lcb.coin_balance,
    lcb.updated_at
FROM bots b
LEFT JOIN league_coin_balances lcb ON b.id = lcb.user_id AND b.league_id = lcb.league_id
ORDER BY b.created_at;

-- Step 4: Show how many players each bot has
SELECT 
    b.id as bot_id,
    b.name as bot_name,
    t.player_ids,
    array_length(t.player_ids, 1) as player_count
FROM bots b
LEFT JOIN teams t ON b.id = t.bot_id
ORDER BY b.created_at; 