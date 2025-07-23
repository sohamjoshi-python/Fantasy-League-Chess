-- Fix RLS policies for marketplace functions
-- This ensures that the marketplace functions can update league data

-- Step 1: Check if leagues table has RLS enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'leagues' 
        AND rowsecurity = true
    ) THEN
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
    END IF;
END $$;

-- Step 2: Ensure teams table allows marketplace operations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'teams' 
        AND rowsecurity = true
    ) THEN
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
    END IF;
END $$;

-- Step 3: Ensure league_coin_balances table allows marketplace operations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'league_coin_balances' 
        AND rowsecurity = true
    ) THEN
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
    END IF;
END $$;

-- Step 4: Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Step 5: Ensure future tables and functions get proper permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated; 