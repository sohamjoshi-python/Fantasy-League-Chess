-- Test marketplace auto-end functionality
-- This script helps verify that the marketplace ends when all players have 0 coins

-- Step 1: Check current marketplace status
SELECT 
    id,
    name,
    marketplace_completed,
    current_marketplace_turn,
    marketplace_order
FROM leagues 
WHERE marketplace_completed = false
ORDER BY created_at DESC;

-- Step 2: Check all coin balances in active marketplaces
SELECT 
    l.id as league_id,
    l.name as league_name,
    lcb.user_id,
    lcb.bot_id,
    lcb.coin_balance,
    CASE 
        WHEN lcb.user_id IS NOT NULL THEN 'User'
        WHEN lcb.bot_id IS NOT NULL THEN 'Bot'
        ELSE 'Unknown'
    END as player_type
FROM leagues l
JOIN league_coin_balances lcb ON l.id = lcb.league_id
WHERE l.marketplace_completed = false
ORDER BY l.created_at DESC, lcb.coin_balance DESC;

-- Step 3: Show which players have insufficient coins (< 5)
SELECT 
    l.id as league_id,
    l.name as league_name,
    COUNT(*) as players_with_insufficient_coins,
    COUNT(CASE WHEN lcb.coin_balance >= 5 THEN 1 END) as players_with_sufficient_coins
FROM leagues l
JOIN league_coin_balances lcb ON l.id = lcb.league_id
WHERE l.marketplace_completed = false
GROUP BY l.id, l.name
ORDER BY l.created_at DESC; 