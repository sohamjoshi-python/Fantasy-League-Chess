-- ========================================
-- AGGRESSIVE FIX FOR LINEUPS 406 ERRORS
-- Completely recreate the lineups table with clean structure
-- ========================================

-- WARNING: This will delete all existing lineup data
-- Run this in your Supabase SQL editor

-- Step 1: Backup existing data (optional)
CREATE TABLE IF NOT EXISTS lineups_backup AS 
SELECT * FROM lineups;

-- Step 2: Drop all dependencies and the table itself
DROP TABLE IF EXISTS lineups CASCADE;

-- Step 3: Create a completely fresh lineups table
CREATE TABLE lineups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    player_ids UUID[] DEFAULT '{}',
    total_points DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create proper indexes
CREATE INDEX idx_lineups_user_league_week ON lineups(user_id, league_id, week_start_date);
CREATE INDEX idx_lineups_league_week ON lineups(league_id, week_start_date);
CREATE INDEX idx_lineups_user_id ON lineups(user_id);
CREATE INDEX idx_lineups_league_id ON lineups(league_id);

-- Step 5: Enable RLS with a very simple policy
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;

-- Step 6: Create a simple, permissive policy
CREATE POLICY "lineups_allow_all_authenticated" ON lineups
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 7: Grant all permissions
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON lineups TO service_role;

-- Step 8: Test the table structure
SELECT 
    'NEW_TABLE_STRUCTURE' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'lineups' 
ORDER BY ordinal_position;

-- Step 9: Test RLS status
SELECT 
    'RLS_STATUS' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'lineups';

-- Step 10: Test RLS policies
SELECT 
    'RLS_POLICIES' as status,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'lineups'
ORDER BY policyname;

-- Step 11: Test a simple query
SELECT 
    'TEST_QUERY' as status,
    COUNT(*) as total_lineups
FROM lineups;

-- Step 12: Test the specific query that's failing
SELECT 
    'TEST_SPECIFIC_QUERY' as status,
    COUNT(*) as matching_lineups
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = '0a8c6fd6-9bd3-411a-8a71-354e42f0e843'::UUID
AND week_start_date = '2025-07-21'::DATE;

-- Step 13: Insert a test record to verify everything works
INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points)
VALUES (
    'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID,
    '0a8c6fd6-9bd3-411a-8a71-354e42f0e843'::UUID,
    '2025-07-21'::DATE,
    '{}'::UUID[],
    0
);

-- Step 14: Test the query again with the test data
SELECT 
    'TEST_WITH_DATA' as status,
    COUNT(*) as matching_lineups
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = '0a8c6fd6-9bd3-411a-8a71-354e42f0e843'::UUID
AND week_start_date = '2025-07-21'::DATE;

-- Step 15: Show final table info
SELECT 
    'FINAL_TABLE_INFO' as status,
    COUNT(*) as total_records
FROM lineups;

-- ========================================
-- IF YOU WANT TO RESTORE DATA FROM BACKUP
-- ========================================

-- Uncomment the following lines if you want to restore data:

/*
-- Restore data from backup (adjust column names if needed)
INSERT INTO lineups (user_id, bot_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
SELECT 
    user_id,
    bot_id,
    league_id,
    week_start_date,
    player_ids,
    total_points,
    created_at,
    updated_at
FROM lineups_backup;

-- Verify restoration
SELECT 
    'RESTORED_DATA' as status,
    COUNT(*) as restored_records
FROM lineups;

-- Drop backup table
DROP TABLE IF EXISTS lineups_backup;
*/ 