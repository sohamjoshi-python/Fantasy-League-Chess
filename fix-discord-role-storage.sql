-- Check current state of leagues table
SELECT 
  id, 
  name, 
  discord_server_id, 
  discord_invite_link, 
  discord_role_id,
  created_at
FROM leagues 
WHERE discord_server_id IS NOT NULL
ORDER BY created_at DESC;

-- Update the discord-bot function to ensure role IDs are stored
-- This is a reminder to check the function code in Supabase Dashboard

-- If you need to manually update role IDs for existing leagues, you can do it here:
-- UPDATE leagues 
-- SET discord_role_id = 'YOUR_ROLE_ID_HERE'
-- WHERE id = 'YOUR_LEAGUE_ID_HERE';

-- Check if the discord_role_id column exists and has the right type
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'leagues' 
AND column_name = 'discord_role_id'; 