-- Simple test for the delete function
-- Run this in your Supabase SQL editor

-- Test 1: Check if function exists
SELECT 'Function exists' as test, 
       proname as function_name 
FROM pg_proc 
WHERE proname = 'delete_league_safe';

-- Test 2: Check current user
SELECT 'Current user' as test, 
       auth.uid() as user_id, 
       auth.role() as role;

-- Test 3: Show available leagues for current user
SELECT 'Available leagues' as test,
       id,
       name,
       creator_id,
       CASE 
           WHEN creator_id = auth.uid() THEN 'CREATOR'
           ELSE 'MEMBER'
       END as access_level
FROM leagues 
WHERE auth.uid() = ANY(member_ids) OR auth.uid() = creator_id
ORDER BY created_at DESC
LIMIT 3; 