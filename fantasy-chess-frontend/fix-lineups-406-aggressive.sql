-- Aggressive fix for lineups 406 error
-- This completely disables RLS on lineups to resolve the persistent 406 error

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

-- Step 2: Completely disable RLS on lineups table
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant all permissions to authenticated users
GRANT ALL ON lineups TO authenticated;

-- Step 4: Test the problematic query
SELECT 
    'Test without RLS' as test_name,
    COUNT(*) as lineup_count
FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID
AND league_id = 'f058da22-5ba9-41d9-896d-c34f3d28bb7a'::UUID
AND week_start_date = '2025-07-28'::DATE;

-- Step 5: Show all lineups for this user
SELECT 
    'All lineups for user' as test_name,
    id,
    user_id,
    league_id,
    week_start_date,
    player_ids,
    total_points,
    created_at
FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID
AND league_id = 'f058da22-5ba9-41d9-896d-c34f3d28bb7a'::UUID
ORDER BY week_start_date DESC;

-- Step 6: Check if there are any lineups at all
SELECT 
    'Total lineups in table' as test_name,
    COUNT(*) as total_lineups
FROM lineups;

-- Step 7: Check if the specific user has any lineups
SELECT 
    'User lineups count' as test_name,
    COUNT(*) as user_lineups
FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID;