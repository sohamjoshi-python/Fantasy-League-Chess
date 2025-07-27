-- Diagnose the leagues table structure
-- Run this in your Supabase SQL editor to see what columns actually exist

-- Check if the leagues table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'leagues' 
AND table_schema = 'public';

-- Check the actual columns in the leagues table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leagues' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if member_ids column exists specifically
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'leagues' 
AND table_schema = 'public'
AND column_name = 'member_ids';

-- Check a sample of leagues data
SELECT 
    id,
    name,
    member_ids,
    array_length(member_ids, 1) as member_count
FROM leagues 
LIMIT 5;

-- Test the unnest function on member_ids
SELECT 
    l.id as league_id,
    l.name as league_name,
    unnest(l.member_ids) as user_id
FROM leagues l
WHERE array_length(l.member_ids, 1) > 0
LIMIT 10; 