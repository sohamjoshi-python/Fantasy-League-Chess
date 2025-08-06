-- Fix missing bot members
-- This script adds bots to league_members table if they're missing

-- ========================================
-- ADD MISSING BOT MEMBERS
-- ========================================

-- Check if there's a bot for this league
SELECT 
    'Bot check' as check_type,
    id,
    name,
    league_id
FROM bots 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID;

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
-- VERIFY THE BOT FIX
-- ========================================

-- Check if bot was added successfully
SELECT 
    'Verification - bot in league_members' as check_type,
    COUNT(*) as bot_count
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
AND display_name LIKE '%🤖%';

-- Show all members including bots
SELECT 
    'Verification - all members including bots' as check_type,
    league_id,
    user_id,
    display_name,
    email
FROM league_members 
WHERE league_id = 'f6d36efa-a859-43f5-857e-d7f6f07a246a'::UUID
ORDER BY display_name; 