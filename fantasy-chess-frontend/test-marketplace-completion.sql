-- Test marketplace completion status
-- This script helps verify that marketplace_completed is being set correctly

-- Step 1: Check current marketplace status for all leagues
SELECT 
    id,
    name,
    marketplace_completed,
    draft_completed,
    current_marketplace_turn,
    marketplace_order,
    CASE 
        WHEN marketplace_completed = true THEN '✅ Marketplace Completed'
        WHEN draft_completed = true THEN '✅ Draft Completed'
        WHEN marketplace_order IS NULL OR array_length(marketplace_order, 1) = 0 THEN '✅ No Marketplace Order'
        ELSE '🔄 Marketplace Active'
    END as status
FROM leagues 
ORDER BY created_at DESC;

-- Step 2: Check specific league that was having issues
SELECT 
    id,
    name,
    marketplace_completed,
    draft_completed,
    current_marketplace_turn,
    marketplace_order,
    array_length(marketplace_order, 1) as order_length
FROM leagues 
WHERE id = '25bd668e-7396-4499-b46e-cd3b69b122b3';

-- Step 3: Check bot coin balances for that league
SELECT 
    b.id as bot_id,
    b.name as bot_name,
    lcb.coin_balance,
    lcb.updated_at
FROM bots b
LEFT JOIN league_coin_balances lcb ON b.id = lcb.bot_id AND b.league_id = lcb.league_id
WHERE b.league_id = '25bd668e-7396-4499-b46e-cd3b69b122b3'; 