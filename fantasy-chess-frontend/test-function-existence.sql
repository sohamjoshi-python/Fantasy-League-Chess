-- Test if the functions exist and check their signatures
-- Run this in your Supabase SQL editor

-- Check if functions exist
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type,
    prosrc as source_code
FROM pg_proc 
WHERE proname LIKE 'delete_league_safe%'
ORDER BY proname;

-- Check function permissions
SELECT 
    p.proname as function_name,
    r.rolname as role_name,
    has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_execute
FROM pg_proc p
JOIN pg_roles r ON r.oid = p.proowner
WHERE p.proname LIKE 'delete_league_safe%';

-- Test a simple function call with explicit casting
SELECT 'Testing function existence' as test;

-- Try to call the function with explicit parameter names
-- This should show us if the function exists and what parameters it expects
SELECT delete_league_safe_with_user(
    'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid,
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid
); 