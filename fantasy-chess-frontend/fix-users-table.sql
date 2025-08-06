-- Fix users table and league_members foreign key constraint
-- This script ensures users exist in public.users table

-- ========================================
-- CHECK CURRENT USERS
-- ========================================

-- Check what users exist in public.users
SELECT 
    'Current public.users' as check_type,
    COUNT(*) as user_count
FROM users;

-- Check what users exist in auth.users for this league
SELECT 
    'Auth users for league' as check_type,
    u.id,
    u.email,
    u.raw_user_meta_data
FROM auth.users u
WHERE u.id IN (
    SELECT creator_id 
    FROM leagues 
    WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
OR u.id IN (
    SELECT unnest(member_ids) 
    FROM leagues 
    WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
);

-- ========================================
-- ADD MISSING USERS TO PUBLIC.USERS
-- ========================================

-- Add creator to public.users if not exists
INSERT INTO users (id, email, username, coins)
SELECT 
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'username',
        u.raw_user_meta_data->>'display_name',
        'user_' || substring(u.id::text from 1 for 6)
    ) as username,
    100 as coins
FROM auth.users u
WHERE u.id = (
    SELECT creator_id 
    FROM leagues 
    WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
AND NOT EXISTS (
    SELECT 1 FROM users pu 
    WHERE pu.id = u.id
);

-- Add all members to public.users if not exists
INSERT INTO users (id, email, username, coins)
SELECT 
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'username',
        u.raw_user_meta_data->>'display_name',
        'user_' || substring(u.id::text from 1 for 6)
    ) as username,
    100 as coins
FROM auth.users u
WHERE u.id IN (
    SELECT unnest(member_ids) 
    FROM leagues 
    WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
AND NOT EXISTS (
    SELECT 1 FROM users pu 
    WHERE pu.id = u.id
);

-- ========================================
-- NOW ADD TO LEAGUE_MEMBERS
-- ========================================

-- Add the creator to league_members
INSERT INTO league_members (league_id, user_id, display_name, email)
SELECT 
    'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID as league_id,
    u.id as user_id,
    COALESCE(
        u.raw_user_meta_data->>'display_name',
        u.raw_user_meta_data->>'username', 
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
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

-- Add each member to league_members
INSERT INTO league_members (league_id, user_id, display_name, email)
SELECT 
    'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID as league_id,
    u.id as user_id,
    COALESCE(
        u.raw_user_meta_data->>'display_name',
        u.raw_user_meta_data->>'username', 
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        'User_' || substring(u.id::text from 1 for 6)
    ) as display_name,
    u.email
FROM auth.users u
WHERE u.id IN (
    SELECT unnest(member_ids) 
    FROM leagues 
    WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
AND NOT EXISTS (
    SELECT 1 FROM league_members lm 
    WHERE lm.league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID 
    AND lm.user_id = u.id
);

-- Add bot to league_members if it exists
INSERT INTO league_members (league_id, user_id, display_name, email)
SELECT 
    'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID as league_id,
    b.id as user_id,
    b.name || ' 🤖' as display_name,
    b.name || '@bot.local' as email
FROM bots b
WHERE b.league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
AND NOT EXISTS (
    SELECT 1 FROM league_members lm 
    WHERE lm.league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID 
    AND lm.user_id = b.id
);

-- ========================================
-- VERIFY THE FIX
-- ========================================

-- Check if users were added to public.users
SELECT 
    'Verification - public.users count' as check_type,
    COUNT(*) as user_count
FROM users;

-- Check if members were added to league_members
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