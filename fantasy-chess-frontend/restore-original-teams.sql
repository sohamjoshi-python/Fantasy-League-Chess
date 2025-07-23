-- First, let's check what the original teams looked like before the migration
-- We need to restore the original drafted players to each users team

-- Step 1: Check if we have any backup of the original teams
-- Look for any tables that might have the original team data
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE%team%' OR table_name LIKE '%draft%';

-- Step 2: If we have a teams table, restore from there
-- This assumes there's a teams table with the original assignments
INSERT INTO user_players (
  user_id, 
  bot_id, 
  league_id, 
  player_username, 
  player_elo, 
  purchase_price, 
  purchased_at
)
SELECT 
  t.user_id,
  NULL as bot_id,
  t.league_id,
  t.player_username,
  cp.elo as player_elo,
  0 as purchase_price,  -- Original drafted players
  NOW() as purchased_at
FROM teams t
JOIN chess_players cp ON t.player_username = cp.name
WHERE NOT EXISTS (
  SELECT 1 FROM user_players up 
  WHERE up.user_id = t.user_id 
    AND up.league_id = t.league_id 
    AND up.player_username = t.player_username
);

-- Step 3: Remove the random assignments we just made
DELETE FROM user_players 
WHERE purchase_price = 0  AND purchased_at > NOW() - INTERVAL '1 hour';  -- Remove recent random assignments

-- Step 4: Mark the restored players as sold in marketplace
UPDATE player_marketplace 
SET sold_at = NOW()
WHERE player_username IN (
  SELECT player_username FROM user_players WHERE purchase_price =0)
AND seller_id IS NULL;

-- Step 5: Verify the restoration
SELECT 
  l.name as league_name,
  u.email,
  COUNT(up.id) as players_assigned,
  STRING_AGG(up.player_username, ', ' ORDER BY up.player_elo DESC) as player_list
FROM leagues l
JOIN league_members lm ON l.id = lm.league_id
JOIN users u ON lm.user_id = u.id
LEFT JOIN user_players up ON u.id = up.user_id AND l.id = up.league_id
WHERE up.purchase_price = 0  -- Original players only
GROUP BY l.id, l.name, u.id, u.email
ORDER BY l.name, u.email; 