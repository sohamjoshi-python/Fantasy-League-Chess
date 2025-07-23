-- Repopulate marketplace with all available players
-- This script adds all chess players back to the marketplace

-- First, clear the marketplace
DELETE FROM player_marketplace;

-- Repopulate with all chess players
INSERT INTO player_marketplace (player_username, player_elo, price, league_id)
SELECT 
    cp.name as player_username,
    cp.elo as player_elo,
    CASE 
        WHEN cp.elo >= 3300 THEN 50  -- Elite (Magnus level)
        WHEN cp.elo >= 3200 THEN 40  -- Super Grandmaster
        WHEN cp.elo >= 3100 THEN 30  -- Grandmaster
        WHEN cp.elo >= 3000 THEN 25  -- Strong International Master
        WHEN cp.elo >= 2900 THEN 20  -- International Master
        WHEN cp.elo >= 2800 THEN 15  -- FIDE Master
        WHEN cp.elo >= 2700 THEN 10  -- Candidate Master
        ELSE 5                       -- Club player
    END as price,
    NULL as league_id  -- Available in all leagues
FROM chess_players cp
WHERE cp.name IS NOT NULL 
  AND cp.name != ''
  AND cp.name NOT LIKE '%unknown%'
  AND cp.name NOT LIKE '%test%'
  AND cp.name NOT LIKE '%TestPlayer%';

-- Show results
SELECT 
    COUNT(*) as total_marketplace_players,
    AVG(price) as average_price,
    MIN(price) as min_price,
    MAX(price) as max_price
FROM player_marketplace; 