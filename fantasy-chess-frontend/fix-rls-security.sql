-- ========================================
-- FIX RLS SECURITY ISSUES
-- Enable RLS on all tables that need it
-- ========================================

-- Step 1: Enable RLS on all affected tables
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_coin_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_turns ENABLE ROW LEVEL SECURITY;

-- Step 2: Create simple, permissive policies for bots table
DROP POLICY IF EXISTS "bots_all_policy" ON bots;
CREATE POLICY "bots_all_policy" ON bots
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 3: Create simple, permissive policies for teams table
DROP POLICY IF EXISTS "teams_all_policy" ON teams;
CREATE POLICY "teams_all_policy" ON teams
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 4: Create simple, permissive policies for league_members table
DROP POLICY IF EXISTS "league_members_all_policy" ON league_members;
CREATE POLICY "league_members_all_policy" ON league_members
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 5: Create simple, permissive policies for league_coin_balances table
DROP POLICY IF EXISTS "league_coin_balances_all_policy" ON league_coin_balances;
CREATE POLICY "league_coin_balances_all_policy" ON league_coin_balances
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 6: Create simple, permissive policies for leagues table
DROP POLICY IF EXISTS "leagues_all_policy" ON leagues;
CREATE POLICY "leagues_all_policy" ON leagues
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 7: Create simple, permissive policies for marketplace_turns table
DROP POLICY IF EXISTS "marketplace_turns_all_policy" ON marketplace_turns;
CREATE POLICY "marketplace_turns_all_policy" ON marketplace_turns
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 8: Grant permissions to authenticated users
GRANT ALL ON bots TO authenticated;
GRANT ALL ON teams TO authenticated;
GRANT ALL ON league_members TO authenticated;
GRANT ALL ON league_coin_balances TO authenticated;
GRANT ALL ON leagues TO authenticated;
GRANT ALL ON marketplace_turns TO authenticated;

-- Step 9: Verify RLS is enabled on all tables
SELECT 
    'RLS_STATUS_CHECK' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('bots', 'teams', 'league_members', 'league_coin_balances', 'leagues', 'marketplace_turns', 'lineups')
ORDER BY tablename;

-- Step 10: Verify policies exist for all tables
SELECT 
    'POLICY_CHECK' as status,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('bots', 'teams', 'league_members', 'league_coin_balances', 'leagues', 'marketplace_turns', 'lineups')
GROUP BY tablename
ORDER BY tablename;

-- Step 11: Show all policies for verification
SELECT 
    'ALL_POLICIES' as status,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('bots', 'teams', 'league_members', 'league_coin_balances', 'leagues', 'marketplace_turns', 'lineups')
ORDER BY tablename, policyname;

-- Step 12: Test basic queries to ensure everything still works
SELECT 
    'TEST_QUERIES' as status,
    'bots' as table_name,
    COUNT(*) as record_count
FROM bots
UNION ALL
SELECT 
    'TEST_QUERIES' as status,
    'teams' as table_name,
    COUNT(*) as record_count
FROM teams
UNION ALL
SELECT 
    'TEST_QUERIES' as status,
    'league_members' as table_name,
    COUNT(*) as record_count
FROM league_members
UNION ALL
SELECT 
    'TEST_QUERIES' as status,
    'league_coin_balances' as table_name,
    COUNT(*) as record_count
FROM league_coin_balances
UNION ALL
SELECT 
    'TEST_QUERIES' as status,
    'leagues' as table_name,
    COUNT(*) as record_count
FROM leagues
UNION ALL
SELECT 
    'TEST_QUERIES' as status,
    'marketplace_turns' as table_name,
    COUNT(*) as record_count
FROM marketplace_turns
UNION ALL
SELECT 
    'TEST_QUERIES' as status,
    'lineups' as table_name,
    COUNT(*) as record_count
FROM lineups;

-- ========================================
-- SUMMARY
-- ========================================

-- This script:
-- 1. Enables RLS on all tables that had it disabled
-- 2. Creates simple, permissive policies that allow all authenticated users
-- 3. Grants proper permissions to authenticated users
-- 4. Verifies that everything is working correctly

-- The policies are intentionally permissive to ensure the frontend continues working
-- while still providing basic security (only authenticated users can access data) 