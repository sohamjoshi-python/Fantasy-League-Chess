-- Comprehensive fix for marketplace functions and REST API issues
-- This migration addresses both 404 function errors and 406 REST API errors

-- Step 1: Ensure all required tables exist with correct schema
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    player_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Step 2: Ensure all required columns exist in existing tables
ALTER TABLE teams ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_ids UUID[] DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE lineups ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS week_start_date DATE;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS player_ids UUID[] DEFAULT '{}';
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS total_points DECIMAL(5,2) DEFAULT 0;
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS coin_balance INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE league_coin_balances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Create marketplace_turns table
CREATE TABLE IF NOT EXISTS marketplace_turns (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('buy', 'skip')),
    player_id UUID REFERENCES chess_players(id) ON DELETE CASCADE,
    price INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Ensure all required columns exist in leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS marketplace_started BOOLEAN DEFAULT false;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS marketplace_order UUID[] DEFAULT '{}';
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS current_marketplace_turn INTEGER DEFAULT 0;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS marketplace_completed BOOLEAN DEFAULT false;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS marketplace_start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS max_players_per_team INTEGER DEFAULT 10;

-- Step 5: Create all marketplace functions
CREATE OR REPLACE FUNCTION start_marketplace(p_league_id UUID)
RETURNS void AS $$
DECLARE
    league_record RECORD;
    member_count INTEGER;
    total_turns INTEGER;
    marketplace_order UUID[];
BEGIN
    -- Get league information
    SELECT * INTO league_record FROM leagues WHERE id = p_league_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'League not found';
    END IF;
    
    -- Calculate total turns needed (10 players per member)
    member_count := array_length(league_record.member_ids, 1);
    total_turns := member_count * 10;
    
    -- Generate marketplace order (snake draft style)
    marketplace_order := '{}';
    FOR i IN 0..9 LOOP
        IF i % 2 = 0 THEN
            -- Forward order
            marketplace_order := marketplace_order || league_record.member_ids;
        ELSE
            -- Reverse order
            marketplace_order := marketplace_order || array_reverse(league_record.member_ids);
        END IF;
    END LOOP;
    
    -- Update league with marketplace settings
    UPDATE leagues 
    SET 
        marketplace_started = true,
        marketplace_start_time = NOW(),
        marketplace_order = marketplace_order,
        current_marketplace_turn = 0,
        marketplace_completed = false
    WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_marketplace_turn(p_league_id UUID)
RETURNS TABLE(
    current_user_id UUID,
    turn_number INTEGER,
    total_turns INTEGER,
    is_completed BOOLEAN,
    user_team_size INTEGER
) AS $$
DECLARE
    league_record RECORD;
    current_user_id UUID;
    user_team_size INTEGER;
BEGIN
    -- Get league information
    SELECT * INTO league_record FROM leagues WHERE id = p_league_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get current user ID from marketplace order
    current_user_id := league_record.marketplace_order[league_record.current_marketplace_turn + 1];
    
    -- Get user's current team size
    SELECT COALESCE(array_length(player_ids, 1), 0) INTO user_team_size
    FROM teams 
    WHERE league_id = p_league_id AND user_id = current_user_id;
    
    RETURN QUERY
    SELECT 
        current_user_id,
        league_record.current_marketplace_turn,
        array_length(league_record.marketplace_order, 1),
        league_record.marketplace_completed,
        COALESCE(user_team_size, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION advance_marketplace_turn(p_league_id UUID)
RETURNS void AS $$
DECLARE
    league_record RECORD;
    new_turn INTEGER;
    total_turns INTEGER;
BEGIN
    -- Get league information
    SELECT * INTO league_record FROM leagues WHERE id = p_league_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'League not found';
    END IF;
    
    -- Calculate new turn
    new_turn := league_record.current_marketplace_turn + 1;
    total_turns := array_length(league_record.marketplace_order, 1);
    
    -- Update league
    UPDATE leagues 
    SET 
        current_marketplace_turn = new_turn,
        marketplace_completed = (new_turn >= total_turns)
    WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_marketplace_action(
    p_league_id UUID,
    p_user_id UUID,
    p_action_type TEXT,
    p_player_id UUID DEFAULT NULL,
    p_price INTEGER DEFAULT NULL,
    p_bot_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Insert marketplace turn record
    INSERT INTO marketplace_turns (
        league_id,
        user_id,
        bot_id,
        turn_number,
        action_type,
        player_id,
        price
    ) VALUES (
        p_league_id,
        p_user_id,
        p_bot_id,
        (SELECT current_marketplace_turn FROM leagues WHERE id = p_league_id),
        p_action_type,
        p_player_id,
        p_price
    );
    
    -- Advance to next turn
    PERFORM advance_marketplace_turn(p_league_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_user_buy_more_players(
    p_league_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    user_team_size INTEGER;
    max_players INTEGER;
BEGIN
    -- Get user's current team size
    SELECT COALESCE(array_length(player_ids, 1), 0) INTO user_team_size
    FROM teams 
    WHERE league_id = p_league_id AND user_id = p_user_id;
    
    -- Get max players per team from league
    SELECT COALESCE(max_players_per_team, 10) INTO max_players
    FROM leagues 
    WHERE id = p_league_id;
    
    -- Return true if user can buy more players
    RETURN user_team_size < max_players;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Grant execute permissions on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Step 7: Create RLS policies for marketplace_turns
DO $$
BEGIN
    -- Policy for league members to view marketplace turns
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketplace_turns' 
        AND policyname = 'League members can view marketplace turns'
    ) THEN
        CREATE POLICY "League members can view marketplace turns" ON marketplace_turns
            FOR SELECT
            TO authenticated
            USING (league_id IN (
                SELECT leagues.id
                FROM leagues
                WHERE leagues.member_ids @> ARRAY[auth.uid()]
            ));
    END IF;
    
    -- Policy for users to create their own marketplace turns
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketplace_turns' 
        AND policyname = 'Users can create their own marketplace turns'
    ) THEN
        CREATE POLICY "Users can create their own marketplace turns" ON marketplace_turns
            FOR INSERT
            TO authenticated
            WITH CHECK (
                (user_id = auth.uid()) OR 
                (league_id IN (
                    SELECT leagues.id
                    FROM leagues
                    WHERE leagues.creator_id = auth.uid()
                ))
            );
    END IF;
END $$;

-- Step 8: Enable RLS on marketplace_turns table
ALTER TABLE marketplace_turns ENABLE ROW LEVEL SECURITY;

-- Step 9: Create permissive RLS policies for marketplace functions
DO $$
BEGIN
    -- Add policy to allow marketplace functions to update leagues
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leagues' 
        AND policyname = 'Allow marketplace function updates'
    ) THEN
        CREATE POLICY "Allow marketplace function updates" ON leagues
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Add policy to allow marketplace functions to read leagues
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leagues' 
        AND policyname = 'Allow marketplace function reads'
    ) THEN
        CREATE POLICY "Allow marketplace function reads" ON leagues
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Step 10: Ensure teams table has proper RLS policies
DO $$
BEGIN
    -- Add policy to allow marketplace functions to read teams
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'teams' 
        AND policyname = 'Allow marketplace function reads'
    ) THEN
        CREATE POLICY "Allow marketplace function reads" ON teams
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    -- Add policy to allow marketplace functions to update teams
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'teams' 
        AND policyname = 'Allow marketplace function updates'
    ) THEN
        CREATE POLICY "Allow marketplace function updates" ON teams
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Add policy to allow marketplace functions to insert teams
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'teams' 
        AND policyname = 'Allow marketplace function inserts'
    ) THEN
        CREATE POLICY "Allow marketplace function inserts" ON teams
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
END $$;

-- Step 11: Ensure league_coin_balances table has proper RLS policies
DO $$
BEGIN
    -- Add policy to allow marketplace functions to read coin balances
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'league_coin_balances' 
        AND policyname = 'Allow marketplace function reads'
    ) THEN
        CREATE POLICY "Allow marketplace function reads" ON league_coin_balances
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    -- Add policy to allow marketplace functions to update coin balances
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'league_coin_balances' 
        AND policyname = 'Allow marketplace function updates'
    ) THEN
        CREATE POLICY "Allow marketplace function updates" ON league_coin_balances
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
    
    -- Add policy to allow marketplace functions to insert coin balances
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'league_coin_balances' 
        AND policyname = 'Allow marketplace function inserts'
    ) THEN
        CREATE POLICY "Allow marketplace function inserts" ON league_coin_balances
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
END $$;

-- Step 12: Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Step 13: Ensure future tables and functions get proper permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

-- Step 14: Verify functions exist
SELECT 
    proname as function_name,
    CASE 
        WHEN proname IN ('start_marketplace', 'get_current_marketplace_turn', 'advance_marketplace_turn', 'record_marketplace_action', 'can_user_buy_more_players') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM pg_proc 
WHERE proname IN ('start_marketplace', 'get_current_marketplace_turn', 'advance_marketplace_turn', 'record_marketplace_action', 'can_user_buy_more_players')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'); 