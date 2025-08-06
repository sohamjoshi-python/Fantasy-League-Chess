-- Add bot_id column to league_coin_balances table
-- This script adds the missing bot_id column for proper bot coin tracking

-- Step 1: Add bot_id column to league_coin_balances table if it doesn't exist
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;

-- Step 2: Make user_id nullable for bot coin balances
ALTER TABLE league_coin_balances ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Update unique constraints to handle both users and bots
-- Drop the existing unique constraint if it exists
ALTER TABLE league_coin_balances DROP CONSTRAINT IF EXISTS league_coin_balances_user_id_league_id_key;

-- Add new unique indexes for users and bots
CREATE UNIQUE INDEX IF NOT EXISTS league_coin_balances_user_league_unique
    ON league_coin_balances (user_id, league_id)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS league_coin_balances_bot_league_unique
    ON league_coin_balances (bot_id, league_id)
    WHERE bot_id IS NOT NULL;

-- Step 4: Migrate existing bot coin balances to use bot_id instead of user_id
UPDATE league_coin_balances 
SET bot_id = user_id, user_id = NULL
WHERE user_id IN (SELECT id FROM bots);

-- Step 5: Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'league_coin_balances' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 6: Show current bot coin balances
SELECT 
    b.id as bot_id,
    b.name as bot_name,
    b.league_id,
    lcb.coin_balance,
    lcb.updated_at
FROM bots b
LEFT JOIN league_coin_balances lcb ON b.id = lcb.bot_id AND b.league_id = lcb.league_id
ORDER BY b.created_at; 