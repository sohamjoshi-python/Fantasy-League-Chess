-- Fix: Lineups RLS policies causing 406 (Not Acceptable) error
-- This fixes the GET lineups query error
-- Run this manually in your Supabase SQL editor

-- Step 1: Check current lineups table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lineups' 
ORDER BY ordinal_position;

-- Step 2: Check current RLS policies on lineups
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'lineups';

-- Step 3: Drop all existing lineups policies to start fresh
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

-- Step 4: Ensure lineups table has RLS enabled
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;

-- Step 5: Create comprehensive lineups policies that work with the frontend queries
-- Policy for SELECT operations (reading lineups)
CREATE POLICY "lineups_select_policy" ON lineups
    FOR SELECT USING (
        -- User can view their own lineups
        (user_id = auth.uid()) OR
        -- Bot lineups (for bot support)
        (bot_id IS NOT NULL) OR
        -- League members can view lineups in their league
        (EXISTS (
            SELECT 1 FROM leagues 
            WHERE id = lineups.league_id 
            AND (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id)
        )) OR
        -- League creators can view all lineups in their leagues
        (EXISTS (
            SELECT 1 FROM leagues 
            WHERE id = lineups.league_id 
            AND auth.uid() = creator_id
        ))
    );

-- Policy for INSERT operations (creating lineups)
CREATE POLICY "lineups_insert_policy" ON lineups
    FOR INSERT WITH CHECK (
        -- User can create their own lineups
        (user_id = auth.uid()) OR
        -- Bot lineups (for bot support)
        (bot_id IS NOT NULL) OR
        -- League creators can create lineups for their leagues
        (EXISTS (
            SELECT 1 FROM leagues 
            WHERE id = lineups.league_id 
            AND auth.uid() = creator_id
        ))
    );

-- Policy for UPDATE operations (updating lineups)
CREATE POLICY "lineups_update_policy" ON lineups
    FOR UPDATE USING (
        -- User can update their own lineups
        (user_id = auth.uid()) OR
        -- Bot lineups (for bot support)
        (bot_id IS NOT NULL) OR
        -- League creators can update lineups in their leagues
        (EXISTS (
            SELECT 1 FROM leagues 
            WHERE id = lineups.league_id 
            AND auth.uid() = creator_id
        ))
    );

-- Policy for DELETE operations (deleting lineups)
CREATE POLICY "lineups_delete_policy" ON lineups
    FOR DELETE USING (
        -- User can delete their own lineups
        (user_id = auth.uid()) OR
        -- Bot lineups (for bot support)
        (bot_id IS NOT NULL) OR
        -- League creators can delete lineups in their leagues
        (EXISTS (
            SELECT 1 FROM leagues 
            WHERE id = lineups.league_id 
            AND auth.uid() = creator_id
        ))
    );

-- Step 6: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON lineups TO authenticated;

-- Step 7: Test the query that was failing
-- This should now work without the 406 error
SELECT 
    'Test query successful' as status,
    COUNT(*) as lineup_count
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID
AND week_start_date = '2025-07-21'::DATE;

-- Step 8: Show all lineups for the user to verify access
SELECT 
    id,
    user_id,
    league_id,
    week_start_date,
    player_ids,
    total_points,
    created_at
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID
ORDER BY week_start_date DESC;

-- Step 9: Verify the policies are working
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'lineups'
ORDER BY policyname; 