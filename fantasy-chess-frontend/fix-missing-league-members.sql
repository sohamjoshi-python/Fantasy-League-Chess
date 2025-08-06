-- Fix missing league members
-- This script adds users to league_members table if they're missing

-- ========================================
-- ADD MISSING LEAGUE MEMBERS
-- ========================================

-- First, let's see what leagues exist and who should be in them
SELECT 
    'Current leagues' as check_type,
    id,
    name,
    creator_id,
    member_ids,
    array_length(member_ids, 1) as member_count
FROM leagues 
WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID;

-- Check what's currently in league_members for this league
SELECT 
    'Current league_members' as check_type,
    league_id,
    user_id,
    display_name,
    email
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID;

-- Check what users exist for this league
SELECT 
    'Users in member_ids' as check_type,
    unnest(member_ids) as user_id
FROM leagues 
WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID;

-- Get user details for the creator and members
SELECT 
    'User details' as check_type,
    u.id,
    u.email,
    u.username,
    u.user_metadata
FROM auth.users u
WHERE u.id IN (
    SELECT unnest(member_ids) 
    FROM leagues 
    WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
);

-- ========================================
-- ADD MISSING MEMBERS TO LEAGUE_MEMBERS
-- ========================================

-- Add the creator to league_members if not already there
INSERT INTO league_members (league_id, user_id, display_name, email)
SELECT 
    'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID as league_id,
    u.id as user_id,
    COALESCE(
        u.user_metadata->>'display_name',
        u.user_metadata->>'username', 
        u.user_metadata->>'full_name',
        u.user_metadata->>'name',
        'User_' || substring(u.id::text from 1 for 6)
    ) as display_name,
    u.email
FROM auth.users u
WHERE u.id = (
    SELECT creator_id 
    FROM leagues 
    WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
AND NOT EXISTS (
    SELECT 1 FROM league_members lm 
    WHERE lm.league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID 
    AND lm.user_id = u.id
);

-- Add all members to league_members if not already there
INSERT INTO league_members (league_id, user_id, display_name, email)
SELECT 
    'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID as league_id,
    u.id as user_id,
    COALESCE(
        u.user_metadata->>'display_name',
        u.user_metadata->>'username', 
        u.user_metadata->>'full_name',
        u.user_metadata->>'name',
        'User_' || substring(u.id::text from 1 for 6)
    ) as display_name,
    u.email
FROM auth.users u
WHERE u.id = ANY(
    SELECT member_ids 
    FROM leagues 
    WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
AND NOT EXISTS (
    SELECT 1 FROM league_members lm 
    WHERE lm.league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID 
    AND lm.user_id = u.id
);

-- ========================================
-- VERIFY THE FIX
-- ========================================

-- Check if members were added successfully
SELECT 
    'Verification - league_members count' as check_type,
    COUNT(*) as member_count
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID;

-- Show all members now in the league
SELECT 
    'Verification - all league members' as check_type,
    league_id,
    user_id,
    display_name,
    email
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
ORDER BY display_name;

-- Test the exact query again
SELECT 
    'Test exact league_members query' as check_type,
    COUNT(*) as result_count
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID; 