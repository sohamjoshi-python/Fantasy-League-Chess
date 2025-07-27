-- Test the delete function from frontend perspective
-- Run this in your Supabase SQL editor

-- Step 1: Check if the function exists and is accessible
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'delete_league_safe';

-- Step 2: Check function permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.routine_privileges 
WHERE routine_name = 'delete_league_safe';

-- Step 3: Test the function with a simple call (this should work)
-- This will test if the function can be called at all
SELECT delete_league_safe('00000000-0000-0000-0000-000000000000'::uuid);

-- Step 4: Show current user and available leagues
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- Step 5: Show leagues the current user can access
SELECT 
    id,
    name,
    creator_id,
    CASE 
        WHEN creator_id = auth.uid() THEN 'CREATOR'
        WHEN auth.uid() = ANY(member_ids) THEN 'MEMBER'
        ELSE 'NO_ACCESS'
    END as access_level
FROM leagues 
WHERE auth.uid() = ANY(member_ids) OR auth.uid() = creator_id
ORDER BY created_at DESC
LIMIT 5;

-- Step 6: Test the access function for a specific league
-- Replace 'YOUR_LEAGUE_ID' with an actual league ID from step 5
SELECT * FROM test_delete_league_access('YOUR_LEAGUE_ID'::uuid); 