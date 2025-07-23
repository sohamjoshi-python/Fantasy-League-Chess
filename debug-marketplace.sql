-- Debug marketplace filtering
-- Run this in Supabase SQL Editor

-- Get sample league
SELECT 'Sample League:' as info;
SELECT id, name FROM leagues LIMIT 1 total marketplace listings
SELECT Total marketplace listings:' as info, COUNT(*) as count 
FROM player_marketplace 
WHERE league_id = (SELECT id FROM leagues LIMIT1ND sold_at IS NULL;

-- Count owned players
SELECT 'Total owned players:' as info, COUNT(*) as count 
FROM user_players 
WHERE league_id = (SELECT id FROM leagues LIMIT 1);

-- Show sample owned players
SELECT 'Sample owned players:' as info;
SELECT player_username, player_elo 
FROM user_players 
WHERE league_id = (SELECT id FROM leagues LIMIT 1)
LIMIT10heck for conflicts
SELECT 'Conflicts (players in both marketplace and owned):' as info, COUNT(*) as count
FROM player_marketplace pm
WHERE pm.league_id = (SELECT id FROM leagues LIMIT1
AND pm.sold_at IS NULL
AND EXISTS (
    SELECT 1 FROM user_players up
    WHERE up.league_id = pm.league_id
    AND up.player_username = pm.player_username
);

-- Show sample conflicts
SELECTSample conflicts:' as info;
SELECT pm.player_username, pm.player_elo
FROM player_marketplace pm
WHERE pm.league_id = (SELECT id FROM leagues LIMIT1
AND pm.sold_at IS NULL
AND EXISTS (
    SELECT 1 FROM user_players up
    WHERE up.league_id = pm.league_id
    AND up.player_username = pm.player_username
)
LIMIT 10; 