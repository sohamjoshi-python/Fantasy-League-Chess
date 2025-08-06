-- DIAGNOSTIC SCRIPT - Check table structure and identify issues
-- Run this to see what's actually in your database

-- ========================================
-- CHECK TABLE STRUCTURE
-- ========================================

-- Check if tables exist
SELECT 
    'Table existence check' as check_type,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('lineups', 'league_members', 'leagues', 'teams', 'bots', 'users', 'chess_players')
ORDER BY table_name;

-- Check lineups table structure
SELECT 
    'lineups table structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lineups' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check league_members table structure
SELECT 
    'league_members table structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'league_members' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check leagues table structure
SELECT 
    'leagues table structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leagues' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- CHECK RLS STATUS
-- ========================================

SELECT 
    'RLS status' as check_type,
    schemaname,
    tablename,
    rowsecurity,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('lineups', 'league_members', 'leagues', 'teams', 'bots', 'users', 'chess_players')
AND schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- CHECK EXISTING POLICIES
-- ========================================

SELECT 
    'Existing policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('lineups', 'league_members', 'leagues', 'teams', 'bots', 'users', 'chess_players')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- CHECK PERMISSIONS
-- ========================================

SELECT 
    'Permissions' as check_type,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name IN ('lineups', 'league_members', 'leagues', 'teams', 'bots', 'users', 'chess_players')
AND table_schema = 'public'
ORDER BY table_name, privilege_type;

-- ========================================
-- CHECK SAMPLE DATA
-- ========================================

-- Check if there's any data in lineups
SELECT 
    'lineups data count' as check_type,
    COUNT(*) as total_rows
FROM lineups;

-- Check if there's any data in league_members
SELECT 
    'league_members data count' as check_type,
    COUNT(*) as total_rows
FROM league_members;

-- Check if there's any data in leagues
SELECT 
    'leagues data count' as check_type,
    COUNT(*) as total_rows
FROM leagues;

-- Check if there's any data in bots
SELECT 
    'bots data count' as check_type,
    COUNT(*) as total_rows
FROM bots;

-- ========================================
-- TEST ACTUAL QUERIES
-- ========================================

-- Test the exact query that's failing
SELECT 
    'Test exact lineups query' as check_type,
    COUNT(*) as result_count
FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID
AND league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
AND week_start_date = '2025-07-28'::DATE;

-- Test the exact league_members query that's failing
SELECT 
    'Test exact league_members query' as check_type,
    COUNT(*) as result_count
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID; 