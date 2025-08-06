-- Add bot_id column to teams table
-- This script adds the missing bot_id column that the marketplace function needs

-- Step 1: Add bot_id column to teams table if it doesn't exist
ALTER TABLE teams ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;

-- Step 2: Make user_id nullable for bot teams
ALTER TABLE teams ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Update unique constraints to handle both users and bots
-- Drop the existing unique constraint if it exists
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_user_id_league_id_key;

-- Add new unique indexes for users and bots
CREATE UNIQUE INDEX IF NOT EXISTS teams_user_league_unique
    ON teams (user_id, league_id)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teams_bot_league_unique
    ON teams (bot_id, league_id)
    WHERE bot_id IS NOT NULL;

-- Step 4: Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'teams' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 5: Show current teams data
SELECT 
    id,
    user_id,
    bot_id,
    league_id,
    player_ids,
    created_at
FROM teams
ORDER BY created_at; 