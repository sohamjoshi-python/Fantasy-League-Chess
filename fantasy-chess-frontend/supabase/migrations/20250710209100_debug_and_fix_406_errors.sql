-- Debug and fix 406 errors
-- This migration checks actual table schemas and fixes mismatches

-- Step 1: Check what tables actually exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'lineups', 'league_coin_balances')
ORDER BY table_name, ordinal_position;

-- Step 2: Check if teams table has the right structure
DO $$
BEGIN
    -- Check if teams table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating teams table...';
        CREATE TABLE teams (
            id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
            league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
            player_ids UUID[] DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- Check if lineups table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lineups' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating lineups table...';
        CREATE TABLE lineups (
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
    END IF;
    
    -- Check if league_coin_balances table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'league_coin_balances' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating league_coin_balances table...';
        CREATE TABLE league_coin_balances (
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
    END IF;
END $$;

-- Step 3: Add missing columns to teams table
DO $$
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'user_id') THEN
        ALTER TABLE teams ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add bot_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'bot_id') THEN
        ALTER TABLE teams ADD COLUMN bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
    END IF;
    
    -- Add league_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'league_id') THEN
        ALTER TABLE teams ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
    END IF;
    
    -- Add player_ids if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'player_ids') THEN
        ALTER TABLE teams ADD COLUMN player_ids UUID[] DEFAULT '{}';
    END IF;
    
    -- Add created_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'created_at') THEN
        ALTER TABLE teams ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Step 4: Add missing columns to lineups table
DO $$
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'user_id') THEN
        ALTER TABLE lineups ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add bot_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'bot_id') THEN
        ALTER TABLE lineups ADD COLUMN bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
    END IF;
    
    -- Add league_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'league_id') THEN
        ALTER TABLE lineups ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
    END IF;
    
    -- Add week_start_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'week_start_date') THEN
        ALTER TABLE lineups ADD COLUMN week_start_date DATE;
    END IF;
    
    -- Add player_ids if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'player_ids') THEN
        ALTER TABLE lineups ADD COLUMN player_ids UUID[] DEFAULT '{}';
    END IF;
    
    -- Add total_points if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'total_points') THEN
        ALTER TABLE lineups ADD COLUMN total_points DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- Add created_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'created_at') THEN
        ALTER TABLE lineups ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'updated_at') THEN
        ALTER TABLE lineups ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Step 5: Add missing columns to league_coin_balances table
DO $$
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_coin_balances' AND column_name = 'user_id') THEN
        ALTER TABLE league_coin_balances ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add bot_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_coin_balances' AND column_name = 'bot_id') THEN
        ALTER TABLE league_coin_balances ADD COLUMN bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
    END IF;
    
    -- Add league_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_coin_balances' AND column_name = 'league_id') THEN
        ALTER TABLE league_coin_balances ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
    END IF;
    
    -- Add coin_balance if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_coin_balances' AND column_name = 'coin_balance') THEN
        ALTER TABLE league_coin_balances ADD COLUMN coin_balance INTEGER DEFAULT 50 NOT NULL;
    END IF;
    
    -- Add created_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_coin_balances' AND column_name = 'created_at') THEN
        ALTER TABLE league_coin_balances ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_coin_balances' AND column_name = 'updated_at') THEN
        ALTER TABLE league_coin_balances ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Step 6: Create RLS policies for teams table
DO $$
BEGIN
    -- Enable RLS on teams table
    ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies to start fresh
    DROP POLICY IF EXISTS "teams_all_policy" ON teams;
    DROP POLICY IF EXISTS "Allow marketplace function reads" ON teams;
    DROP POLICY IF EXISTS "Allow marketplace function updates" ON teams;
    DROP POLICY IF EXISTS "Allow marketplace function inserts" ON teams;
    
    -- Create comprehensive policy for teams
    CREATE POLICY "teams_all_policy" ON teams
        FOR ALL USING (
            user_id = auth.uid() OR 
            bot_id IS NOT NULL OR
            auth.uid() IN (
                SELECT creator_id FROM leagues WHERE id = teams.league_id
            )
        );
END $$;

-- Step 7: Create RLS policies for lineups table
DO $$
BEGIN
    -- Enable RLS on lineups table
    ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies to start fresh
    DROP POLICY IF EXISTS "lineups_all_policy" ON lineups;
    
    -- Create comprehensive policy for lineups
    CREATE POLICY "lineups_all_policy" ON lineups
        FOR ALL USING (
            user_id = auth.uid() OR 
            bot_id IS NOT NULL OR
            auth.uid() IN (
                SELECT creator_id FROM leagues WHERE id = lineups.league_id
            )
        );
END $$;

-- Step 8: Create RLS policies for league_coin_balances table
DO $$
BEGIN
    -- Enable RLS on league_coin_balances table
    ALTER TABLE league_coin_balances ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies to start fresh
    DROP POLICY IF EXISTS "Allow marketplace function reads" ON league_coin_balances;
    DROP POLICY IF EXISTS "Allow marketplace function updates" ON league_coin_balances;
    DROP POLICY IF EXISTS "Allow marketplace function inserts" ON league_coin_balances;
    
    -- Create comprehensive policy for league_coin_balances
    CREATE POLICY "league_coin_balances_all_policy" ON league_coin_balances
        FOR ALL USING (
            user_id = auth.uid() OR 
            bot_id IS NOT NULL OR
            auth.uid() IN (
                SELECT creator_id FROM leagues WHERE id = league_coin_balances.league_id
            )
        );
END $$;

-- Step 9: Grant permissions
GRANT ALL ON teams TO authenticated;
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON league_coin_balances TO authenticated;

-- Step 10: Check final table schemas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'lineups', 'league_coin_balances')
ORDER BY table_name, ordinal_position;

-- Step 11: Test if we can query the tables
SELECT 'teams' as table_name, COUNT(*) as row_count FROM teams
UNION ALL
SELECT 'lineups' as table_name, COUNT(*) as row_count FROM lineups
UNION ALL
SELECT 'league_coin_balances' as table_name, COUNT(*) as row_count FROM league_coin_balances; 