-- Delete Unknown and Test Players from user_players table
-- Run this script in your Supabase SQL editor

-- First, let's see what unknown and test players exist
SELECT 
    'Unknown and test players found' as status,
    COUNT(*) as count
FROM user_players 
WHERE player_username IN ('unknown', 'test player', 'Unknown Player', 'Unknown', 'Test Player', 'test', 'Test', 'TestPlayer')
   OR player_username IS NULL 
   OR player_username = ''
   OR player_username IN ('a', 'b', 'c', 'test', 'temp', 'dummy');

-- Show the unknown and test players before deletion
SELECT 
    id,
    player_username,
    player_elo,
    user_id,
    bot_id,
    purchased_at
FROM user_players 
WHERE player_username IN ('unknown', 'test player', 'Unknown Player', 'Unknown', 'Test Player', 'test', 'Test', 'TestPlayer')
   OR player_username IS NULL 
   OR player_username = ''
   OR player_username IN ('a', 'b', 'c', 'test', 'temp', 'dummy')
ORDER BY player_username;

-- Delete unknown and test players
DELETE FROM user_players 
WHERE player_username IN ('unknown', 'test player', 'Unknown Player', 'Unknown', 'Test Player', 'test', 'Test', 'TestPlayer')
   OR player_username IS NULL 
   OR player_username = ''
   OR player_username IN ('a', 'b', 'c', 'test', 'temp', 'dummy');

-- Verify deletion
SELECT 
    'Remaining players' as status,
    COUNT(*) as count
FROM user_players;

-- Show a sample of remaining players
SELECT 
    player_username,
    player_elo,
    purchased_at
FROM user_players 
ORDER BY purchased_at DESC 
LIMIT 10; 