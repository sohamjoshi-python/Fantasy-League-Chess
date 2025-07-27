-- Test league deletion functionality
-- Run this in your Supabase SQL editor

-- Step 1: Check if the safe delete function exists
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'delete_league_safe';

-- Step 2: Check current leagues and their creators
SELECT 
    id,
    name,
    creator_id,
    member_ids,
    array_length(member_ids, 1) as member_count,
    draft_completed,
    marketplace_started,
    marketplace_completed
FROM leagues 
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Check foreign key constraints are set to CASCADE
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'leagues'
ORDER BY tc.table_name, kcu.column_name;

-- Step 4: Check RLS policies for leagues table
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

-- Step 5: Test the safe delete function (replace with actual league ID)
-- WARNING: This will actually delete the league and all related data!
-- Only run this on a test league you want to delete
/*
SELECT delete_league_safe('YOUR_LEAGUE_ID_HERE');
*/ 