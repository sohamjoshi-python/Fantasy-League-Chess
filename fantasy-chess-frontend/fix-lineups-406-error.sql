-- Fix: Lineups 406 error by updating RLS policies
-- Run this in your Supabase SQL editor

-- Step 1: Drop all existing lineups policies
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

-- Step 2: Ensure RLS is enabled
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a simple, permissive policy for all operations
CREATE POLICY "lineups_allow_all_authenticated" ON lineups
    FOR ALL USING (
        auth.uid() IS NOT NULL
    );

-- Step 4: Grant necessary permissions
GRANT ALL ON lineups TO authenticated;

-- Step 5: Verify the policy was created
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'lineups'
ORDER BY policyname; 