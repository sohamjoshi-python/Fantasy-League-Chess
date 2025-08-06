-- Fix bot coin balance: Add coin balance records for existing bots
-- This script adds coin balance records for bots that don't have them

-- First, let's see what bots exist
SELECT 
    b.id as bot_id,
    b.name as bot_name,
    b.league_id,
    lcb.user_id as existing_coin_balance_user_id
FROM bots b
LEFT JOIN league_coin_balances lcb ON b.id = lcb.user_id AND b.league_id = lcb.league_id
ORDER BY b.created_at;

-- Now add coin balance records for bots that don't have them
INSERT INTO league_coin_balances (user_id, league_id, coin_balance, created_at, updated_at)
SELECT 
    b.id as user_id,
    b.league_id,
    50 as coin_balance,
    NOW() as created_at,
    NOW() as updated_at
FROM bots b
LEFT JOIN league_coin_balances lcb ON b.id = lcb.user_id AND b.league_id = lcb.league_id
WHERE lcb.user_id IS NULL;

-- Verify the fix
SELECT 
    b.id as bot_id,
    b.name as bot_name,
    b.league_id,
    lcb.coin_balance,
    lcb.created_at as balance_created_at
FROM bots b
LEFT JOIN league_coin_balances lcb ON b.id = lcb.user_id AND b.league_id = lcb.league_id
ORDER BY b.created_at; 