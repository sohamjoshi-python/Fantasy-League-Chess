-- Simple marketplace debug
-- Copy and paste this into Supabase SQL Editor

-- Get first league
SELECT First League:' as info;
SELECT id, name FROM leagues LIMIT 1;

-- Count marketplace listings
SELECT 'Marketplace listings:' as info, COUNT(*) as count 
FROM player_marketplace 
WHERE league_id = (SELECT id FROM leagues LIMIT1ND sold_at IS NULL;

-- Count owned players
SELECT 'Owned players:' as info, COUNT(*) as count 
FROM user_players 
WHERE league_id = (SELECT id FROM leagues LIMIT1-- Show some owned players
SELECT 'Owned players sample:' as info;
SELECT player_username, player_elo 
FROM user_players 
WHERE league_id = (SELECT id FROM leagues LIMIT 1)
LIMIT 5; 