-- Simple fix for 406 errors
-- This migration ensures all required tables and columns exist

-- Step 1: Create teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    player_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create lineups table if it doesn't exist
CREATE TABLE IF NOT EXISTS lineups (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    player_ids UUID[] DEFAULT '{}',
    total_points DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create league_coin_balances table if it doesn't exist
CREATE TABLE IF NOT EXISTS league_coin_balances (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    coin_balance INTEGER DEFAULT 50 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, league_id),
    UNIQUE(bot_id, league_id)
);

-- Step 4: Add missing columns to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_ids UUID[] DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 5: Add missing columns to lineups table
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS week_start_date DATE;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS player_ids UUID[] DEFAULT '{}';
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS total_points DECIMAL(5,2) DEFAULT 0;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 6: Add missing columns to league_coin_balances table
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS coin_balance INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 7: Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_coin_balances ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing policies to start fresh
DROP POLICY IF EXISTS "teams_all_policy" ON teams;
DROP POLICY IF EXISTS "lineups_all_policy" ON lineups;
DROP POLICY IF EXISTS "league_coin_balances_all_policy" ON league_coin_balances;

-- Step 9: Create comprehensive RLS policies
CREATE POLICY "teams_all_policy" ON teams
    FOR ALL USING (
        user_id = auth.uid() OR 
        bot_id IS NOT NULL OR
        auth.uid() IN (
            SELECT creator_id FROM leagues WHERE id = teams.league_id
        )
    );

CREATE POLICY "lineups_all_policy" ON lineups
    FOR ALL USING (
        user_id = auth.uid() OR 
        bot_id IS NOT NULL OR
        auth.uid() IN (
            SELECT creator_id FROM leagues WHERE id = lineups.league_id
        )
    );

CREATE POLICY "league_coin_balances_all_policy" ON league_coin_balances
    FOR ALL USING (
        user_id = auth.uid() OR 
        bot_id IS NOT NULL OR
        auth.uid() IN (
            SELECT creator_id FROM leagues WHERE id = league_coin_balances.league_id
        )
    );

-- Step 10: Grant permissions
GRANT ALL ON teams TO authenticated;
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON league_coin_balances TO authenticated;

-- Step 11: Check table schemas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'lineups', 'league_coin_balances')
ORDER BY table_name, ordinal_position;

-- Step 12: Test if we can query the tables
SELECT 'teams' as table_name, COUNT(*) as row_count FROM teams
UNION ALL
SELECT 'lineups' as table_name, COUNT(*) as row_count FROM lineups
UNION ALL
SELECT 'league_coin_balances' as table_name, COUNT(*) as row_count FROM league_coin_balances; 