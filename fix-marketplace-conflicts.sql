-- Fix marketplace conflicts by removing listings for owned players
-- This will remove marketplace listings for players that are already owned

-- First, let's see the conflicts
SELECT Conflicts found:' as info, COUNT(*) as count
FROM player_marketplace pm
WHERE pm.sold_at IS NULL
AND EXISTS (
    SELECT 1 FROM user_players up
    WHERE up.league_id = pm.league_id
    AND up.player_username = pm.player_username
);

-- Show some sample conflicts
SELECTSample conflicts:' as info;
SELECT pm.league_id, pm.player_username, pm.player_elo
FROM player_marketplace pm
WHERE pm.sold_at IS NULL
AND EXISTS (
    SELECT 1 FROM user_players up
    WHERE up.league_id = pm.league_id
    AND up.player_username = pm.player_username
)
LIMIT 10ve the conflicting marketplace listings
DELETE FROM player_marketplace 
WHERE sold_at IS NULL
AND EXISTS (
    SELECT 1 FROM user_players up
    WHERE up.league_id = player_marketplace.league_id
    AND up.player_username = player_marketplace.player_username
);

-- Verify the fix
SELECT 'Conflicts after fix:' as info, COUNT(*) as count
FROM player_marketplace pm
WHERE pm.sold_at IS NULL
AND EXISTS (
    SELECT 1 FROM user_players up
    WHERE up.league_id = pm.league_id
    AND up.player_username = pm.player_username
);

-- Show final marketplace count
SELECT Final marketplace count:' as info, COUNT(*) as count
FROM player_marketplace 
WHERE sold_at IS NULL; 