-- Diagnose league access issues
-- Run this in your Supabase SQL editor

-- Step 1: Check current user authentication
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- Step 2: Show leagues and their creators
SELECT 
    id,
    name,
    creator_id,
    member_ids,
    array_length(member_ids, 1) as member_count,
    created_at
FROM leagues 
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Test access to a specific league (replace with actual league ID)
-- Replace 'YOUR_LEAGUE_ID' with the league ID you're trying to delete
SELECT 
    l.id,
    l.name,
    l.creator_id,
    auth.uid() as current_user_id,
    l.creator_id = auth.uid() as is_creator,
    auth.uid() = ANY(l.member_ids) as is_member,
    'CAN_DELETE' as access_check
FROM leagues l
WHERE l.id = 'YOUR_LEAGUE_ID' -- Replace with actual league ID
LIMIT 1;

-- Step 4: Test the access function (replace with actual league ID)
-- Replace 'YOUR_LEAGUE_ID' with the league ID you're trying to delete
SELECT * FROM test_delete_league_access('YOUR_LEAGUE_ID'::uuid);

-- Step 5: Check RLS policies on leagues table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'leagues'
ORDER BY policyname;

-- Step 6: Check if the user can see the league at all
-- This will show what leagues the current user can access
SELECT 
    id,
    name,
    creator_id,
    'VISIBLE_TO_USER' as access_status
FROM leagues 
WHERE auth.uid() = ANY(member_ids) OR auth.uid() = creator_id
ORDER BY created_at DESC; 