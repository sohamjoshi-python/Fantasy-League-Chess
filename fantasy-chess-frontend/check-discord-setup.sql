-- Check and Fix Discord Integration Setup
-- Run this in your Supabase SQL editor to diagnose and fix Discord issues

-- Step 1: Check if Discord columns exist in leagues table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'leagues' 
AND column_name IN ('discord_server_id', 'discord_invite_link', 'discord_role_id')
ORDER BY column_name;

-- Step 2: Add Discord columns if they don't exist
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS discord_server_id TEXT,
ADD COLUMN IF NOT EXISTS discord_invite_link TEXT,
ADD COLUMN IF NOT EXISTS discord_role_id TEXT;

-- Step 3: Check current Discord data in leagues
SELECT 
  id, 
  name, 
  join_code,
  discord_server_id, 
  discord_invite_link, 
  discord_role_id,
  created_at
FROM leagues 
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check if your specific league has Discord data
-- Replace 'YOUR_LEAGUE_NAME' with your actual league name
SELECT 
  id, 
  name, 
  join_code,
  discord_server_id, 
  discord_invite_link, 
  discord_role_id,
  created_at
FROM leagues 
WHERE name ILIKE '%YOUR_LEAGUE_NAME%'
ORDER BY created_at DESC;

-- Step 5: If you need to manually set Discord data for testing
-- Replace the UUID and values with your actual data
-- UPDATE leagues 
-- SET 
--   discord_server_id = 'YOUR_DISCORD_CHANNEL_ID',
--   discord_invite_link = 'https://discord.gg/YOUR_INVITE_CODE'
-- WHERE id = 'YOUR_LEAGUE_UUID';

-- Step 6: Verify the update worked
-- SELECT 
--   id, 
--   name, 
--   discord_server_id, 
--   discord_invite_link 
-- FROM leagues 
-- WHERE id = 'YOUR_LEAGUE_UUID';
