-- AGGRESSIVE RLS FIX - Complete removal of all RLS policies
-- This script completely disables RLS on all problematic tables

-- ========================================
-- COMPLETELY DISABLE RLS ON ALL TABLES
-- ========================================

-- 1. LINEUPS TABLE
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lineups_select_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_insert_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_update_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_delete_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_all_policy" ON lineups;
DROP POLICY IF EXISTS "Users can view their own lineups" ON lineups;
DROP POLICY IF EXISTS "Users can create their own lineups" ON lineups;
DROP POLICY IF EXISTS "Users can update their own lineups" ON lineups;
DROP POLICY IF EXISTS "Users can delete their own lineups" ON lineups;
DROP POLICY IF EXISTS "Users and bots can create lineups" ON lineups;
DROP POLICY IF EXISTS "Users and bots can update lineups" ON lineups;
DROP POLICY IF EXISTS "League members can view all lineups in their league" ON lineups;
DROP POLICY IF EXISTS "Allow all lineup operations" ON lineups;
DROP POLICY IF EXISTS "lineups_permissive_all" ON lineups;
DROP POLICY IF EXISTS "lineups_allow_all_authenticated" ON lineups;

-- 2. LEAGUE_MEMBERS TABLE
ALTER TABLE league_members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view members in their leagues" ON league_members;
DROP POLICY IF EXISTS "League creators can manage members" ON league_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON league_members;
DROP POLICY IF EXISTS "league_members_select_policy" ON league_members;
DROP POLICY IF EXISTS "league_members_insert_policy" ON league_members;
DROP POLICY IF EXISTS "league_members_update_policy" ON league_members;
DROP POLICY IF EXISTS "league_members_delete_policy" ON league_members;

-- 3. LEAGUES TABLE
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own leagues" ON leagues;
DROP POLICY IF EXISTS "Users can create their own leagues" ON leagues;
DROP POLICY IF EXISTS "Users can update their own leagues" ON leagues;
DROP POLICY IF EXISTS "Users can delete their own leagues" ON leagues;
DROP POLICY IF EXISTS "leagues_select_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_insert_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_update_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_delete_policy" ON leagues;

-- 4. TEAMS TABLE
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own teams" ON teams;
DROP POLICY IF EXISTS "Users can create their own teams" ON teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON teams;

-- 5. BOTS TABLE
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view bots in their leagues" ON bots;
DROP POLICY IF EXISTS "Users can create bots in their leagues" ON bots;
DROP POLICY IF EXISTS "Users can update bots in their leagues" ON bots;
DROP POLICY IF EXISTS "Users can delete bots in their leagues" ON bots;
DROP POLICY IF EXISTS "League creators can manage bots" ON bots;
DROP POLICY IF EXISTS "League members can view bots" ON bots;

-- 6. USERS TABLE
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- 7. CHESS_PLAYERS TABLE
ALTER TABLE chess_players DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view chess players" ON chess_players;

-- ========================================
-- GRANT ALL PERMISSIONS TO AUTHENTICATED USERS
-- ========================================

GRANT ALL ON lineups TO authenticated;
GRANT ALL ON league_members TO authenticated;
GRANT ALL ON leagues TO authenticated;
GRANT ALL ON teams TO authenticated;
GRANT ALL ON bots TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON chess_players TO authenticated;

-- ========================================
-- VERIFY RLS IS DISABLED
-- ========================================

SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('lineups', 'league_members', 'leagues', 'teams', 'bots', 'users', 'chess_players')
ORDER BY tablename;

-- ========================================
-- TEST QUERIES
-- ========================================

-- Test lineups query
SELECT 
    'Test lineups query' as test_name,
    COUNT(*) as lineup_count
FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID
AND league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
AND week_start_date = '2025-07-28'::DATE;

-- Test league_members query
SELECT 
    'Test league_members query' as test_name,
    COUNT(*) as member_count
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID;

-- Test leagues query
SELECT 
    'Test leagues query' as test_name,
    COUNT(*) as league_count
FROM leagues 
WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID;

-- Test bots query
SELECT 
    'Test bots query' as test_name,
    COUNT(*) as bot_count
FROM bots 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID;

-- ========================================
-- SHOW ALL POLICIES (should be empty)
-- ========================================

SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename IN ('lineups', 'league_members', 'leagues', 'teams', 'bots', 'users', 'chess_players')
ORDER BY tablename, policyname; 