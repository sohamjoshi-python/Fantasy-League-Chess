-- Comprehensive fix for bots table RLS issues
-- This script completely disables RLS and grants all permissions

-- Step 1: Disable RLS on bots table
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing RLS policies on bots table
DROP POLICY IF EXISTS "Enable read access for all users" ON bots;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON bots;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON bots;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON bots;
DROP POLICY IF EXISTS "Bots can be read by all users" ON bots;
DROP POLICY IF EXISTS "Bots can be created by authenticated users" ON bots;
DROP POLICY IF EXISTS "Bots can be updated by their creator" ON bots;
DROP POLICY IF EXISTS "Bots can be deleted by their creator" ON bots;

-- Step 3: Grant all permissions to all roles
GRANT ALL ON bots TO authenticated;
GRANT ALL ON bots TO anon;
GRANT ALL ON bots TO service_role;

-- Step 4: Grant usage on sequence if it exists
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Step 5: Verify the changes
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'bots'
AND schemaname = 'public';

-- Step 6: Test a simple query
SELECT COUNT(*) FROM bots;

-- Step 7: Show all policies on bots table (should be empty)
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename = 'bots'; 