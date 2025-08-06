-- Clean fix for league_members
-- Simple approach: add missing columns and insert members

-- ========================================
-- STEP 1: ADD MISSING COLUMNS TO LEAGUE_MEMBERS
-- ========================================

-- Add display_name column if missing
ALTER TABLE league_members ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add email column if missing  
ALTER TABLE league_members ADD COLUMN IF NOT EXISTS email TEXT;

-- Add joined_at column if missing
ALTER TABLE league_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- STEP 2: ADD MISSING USERS TO PUBLIC.USERS
-- ========================================

-- Add creator to public.users
INSERT INTO users (id, email, username, coins)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'username', 'user_' || substring(u.id::text from 1 for 6)),
    100
FROM auth.users u
WHERE u.id = (
    SELECT creator_id FROM leagues WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
ON CONFLICT (id) DO NOTHING;

-- Add all members to public.users
INSERT INTO users (id, email, username, coins)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'username', 'user_' || substring(u.id::text from 1 for 6)),
    100
FROM auth.users u
WHERE u.id = ANY(
    SELECT member_ids FROM leagues WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 3: ADD MEMBERS TO LEAGUE_MEMBERS
-- ========================================

-- Add creator to league_members
INSERT INTO league_members (league_id, user_id, display_name, email)
SELECT 
    'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID,
    u.id,
    COALESCE(
        u.raw_user_meta_data->>'display_name',
        u.raw_user_meta_data->>'username',
        'User_' || substring(u.id::text from 1 for 6)
    ),
    u.email
FROM auth.users u
WHERE u.id = (
    SELECT creator_id FROM leagues WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
ON CONFLICT (league_id, user_id) DO NOTHING;

-- Add all members to league_members
INSERT INTO league_members (league_id, user_id, display_name, email)
SELECT 
    'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID,
    u.id,
    COALESCE(
        u.raw_user_meta_data->>'display_name',
        u.raw_user_meta_data->>'username',
        'User_' || substring(u.id::text from 1 for 6)
    ),
    u.email
FROM auth.users u
WHERE u.id = ANY(
    SELECT member_ids FROM leagues WHERE id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
)
ON CONFLICT (league_id, user_id) DO NOTHING;

-- Add bot to league_members if exists
INSERT INTO league_members (league_id, user_id, display_name, email)
SELECT 
    'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID,
    b.id,
    b.name || ' 🤖',
    b.name || '@bot.local'
FROM bots b
WHERE b.league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
ON CONFLICT (league_id, user_id) DO NOTHING;

-- ========================================
-- STEP 4: VERIFY RESULTS
-- ========================================

-- Show final results
SELECT 
    'Final league_members count' as check_type,
    COUNT(*) as member_count
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID;

SELECT 
    'All league members' as check_type,
    user_id,
    display_name,
    email
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
ORDER BY display_name; 