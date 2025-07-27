-- Verify the delete_league_safe function exists and works
-- Run this in your Supabase SQL editor

-- Step 1: Check if the function exists
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'delete_league_safe';

-- Step 2: Check if the function has proper permissions
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    r.rolname as owner
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'delete_league_safe';

-- Step 3: Check if authenticated users can execute it
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.routine_privileges 
WHERE routine_name = 'delete_league_safe';

-- Step 4: Test the function with a dummy call (this will fail but show the error)
-- Replace 'test-league-id' with an actual league ID if you want to test
SELECT delete_league_safe('00000000-0000-0000-0000-000000000000'::uuid);

-- Step 5: Show current leagues for testing
SELECT 
    id,
    name,
    creator_id,
    created_at
FROM leagues 
ORDER BY created_at DESC
LIMIT 3; 