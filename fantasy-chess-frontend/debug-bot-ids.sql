-- Debug bot IDs and structure
-- This script helps understand how bots are stored

-- Step 1: Check bot table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'bots' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Show all bots with their IDs
SELECT 
    id,
    name,
    league_id,
    created_at
FROM bots
ORDER BY created_at DESC;

-- Step 3: Check if there are any bots with user-like IDs
SELECT 
    id,
    name,
    league_id
FROM bots
WHERE id LIKE '4a6364e1-426c-4c37-9fe3-b3eab4cf1425';

-- Step 4: Show marketplace order for a specific league
SELECT 
    id,
    name,
    marketplace_order,
    current_marketplace_turn
FROM leagues
WHERE id = '60ffba3c-23a0-4539-b401-473c11d5d115'; 