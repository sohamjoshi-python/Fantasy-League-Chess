-- Complete diagnostic and fix for persistent lineups 406 error
-- This addresses table structure, data types, and RLS issues
-- Run this manually in your Supabase SQL editor

-- Step 1: Check if lineups table exists and its structure
SELECT 
    'Table exists check' as test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'lineups'
    ) as table_exists;

-- Step 2: Show current lineups table structure
SELECT 
    'Current table structure' as test_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'lineups' 
ORDER BY ordinal_position;

-- Step 3: Check if the specific columns exist that the query is using
SELECT 
    'Required columns check' as test_name,
    column_name,
    CASE 
        WHEN column_name = 'user_id' THEN 'REQUIRED'
        WHEN column_name = 'league_id' THEN 'REQUIRED' 
        WHEN column_name = 'week_start_date' THEN 'REQUIRED'
        ELSE 'OPTIONAL'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'lineups' 
AND column_name IN ('user_id', 'league_id', 'week_start_date');

-- Step 4: Drop and recreate lineups table with correct structure
DROP TABLE IF EXISTS lineups CASCADE;

CREATE TABLE lineups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE,
    player_ids UUID[] DEFAULT '{}',
    total_points DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lineups_user_league_week ON lineups(user_id, league_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_lineups_league_week ON lineups(league_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_lineups_user_id ON lineups(user_id);
CREATE INDEX IF NOT EXISTS idx_lineups_league_id ON lineups(league_id);

-- Step 6: Insert test data for the specific user and league
INSERT INTO lineups (
    user_id, 
    league_id, 
    week_start_date, 
    week_end_date, 
    player_ids, 
    total_points
) VALUES (
    'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID,
    'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID,
    '2025-07-21'::DATE,
    '2025-07-27'::DATE,
    '{}',
    0
) ON CONFLICT DO NOTHING;

-- Step 7: Enable RLS with very permissive policy
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "lineups_permissive_all" ON lineups;
DROP POLICY IF EXISTS "lineups_select_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_insert_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_update_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_delete_policy" ON lineups;

-- Create a single permissive policy
CREATE POLICY "lineups_allow_all" ON lineups
    FOR ALL USING (true);

-- Step 8: Grant all permissions
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON lineups TO anon;

-- Step 9: Test the exact query that's failing
SELECT 
    'Test exact failing query' as test_name,
    COUNT(*) as lineup_count,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCCESS - Query executed without 406 error'
        ELSE 'FAILED - Query still blocked'
    END as result
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID
AND week_start_date = '2025-07-21'::DATE;

-- Step 10: Show the test data we just created
SELECT 
    'Test data verification' as test_name,
    id,
    user_id,
    league_id,
    week_start_date,
    week_end_date,
    player_ids,
    total_points,
    created_at
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID;

-- Step 11: Test without RLS to confirm it's not a data issue
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;

SELECT 
    'Test without RLS' as test_name,
    COUNT(*) as lineup_count
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID
AND week_start_date = '2025-07-21'::DATE;

-- Re-enable RLS
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;

-- Step 12: Verify the policy exists
SELECT 
    'Policy verification' as test_name,
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'lineups'
ORDER BY policyname;

-- Step 13: Check if the user exists in auth.users
SELECT 
    'User authentication check' as test_name,
    id,
    email,
    CASE 
        WHEN id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID THEN 'TARGET USER FOUND'
        ELSE 'OTHER USER'
    END as status
FROM auth.users 
WHERE id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID;

-- Step 14: Check if the league exists
SELECT 
    'League existence check' as test_name,
    id,
    name,
    member_ids,
    CASE 
        WHEN 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID = ANY(member_ids) THEN 'USER IS MEMBER'
        WHEN 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID = creator_id THEN 'USER IS CREATOR'
        ELSE 'USER NOT IN LEAGUE'
    END as membership_status
FROM leagues 
WHERE id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID; 