-- Fix league_members table structure
-- This script checks the table structure and adds missing columns

-- ========================================
-- CHECK CURRENT TABLE STRUCTURE
-- ========================================

-- Check what columns exist in league_members
SELECT 
    'Current league_members structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'league_members' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- ADD MISSING COLUMNS
-- ========================================

-- Add display_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'league_members' 
        AND column_name = 'display_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE league_members ADD COLUMN display_name TEXT;
    END IF;
END $$;

-- Add email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'league_members' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE league_members ADD COLUMN email TEXT;
    END IF;
END $$;

-- Add joined_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'league_members' 
        AND column_name = 'joined_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE league_members ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- ========================================
-- VERIFY UPDATED STRUCTURE
-- ========================================

-- Check the updated table structure
SELECT 
    'Updated league_members structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'league_members' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- NOW ADD MISSING MEMBERS
-- ========================================

-- Add the creator to league_members if not already there
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

-- Add all members to league_members if not already there
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

-- Add bot to league_members if it exists and is not already there
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