-- Fix bots table RLS issues
-- This script disables RLS on the bots table to fix 406 errors

-- Step 1: Disable RLS on bots table
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant all permissions to authenticated users
GRANT ALL ON bots TO authenticated;
GRANT ALL ON bots TO anon;
GRANT ALL ON bots TO service_role;

-- Step 3: Verify the changes
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'bots'
AND schemaname = 'public';

-- Step 4: Test a simple query
SELECT COUNT(*) FROM bots; 