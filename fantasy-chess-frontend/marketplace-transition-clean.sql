-- Migration script to transition from draft system to marketplace-only
-- This moves all previously drafted players to the marketplace for fair distribution

-- Step 1: Move all drafted players (purchase_price = 0marketplace
INSERT INTO player_marketplace (
  player_username, 
  player_elo, 
  price, 
  seller_id, 
  seller_bot_id, 
  league_id, 
  is_bot_seller,
  created_at
)
SELECT 
  up.player_username,
  up.player_elo,
  -- Calculate fair initial price based on ELO (same as regular marketplace pricing)
  CASE 
    WHEN up.player_elo >= 3400N50 -- Elite tier
    WHEN up.player_elo >= 3300 THEN40 -- Strong tier  
    WHEN up.player_elo >= 320EN 30Good tier
    WHEN up.player_elo >= 3100 THEN 20- Average tier
    WHEN up.player_elo >= 3000 THEN 15 -- Developing tier
    ELSE 10 -- Beginner tier
  END as price,
  NULL as seller_id,  -- No specific seller, system-owned
  NULL as seller_bot_id,
  up.league_id,
  FALSE as is_bot_seller,
  NOW() as created_at
FROM user_players up
WHERE up.purchase_price = 0ly drafted players
  AND up.bot_id IS NULL;     -- Only human players, not bots

-- Step 2: Delete all drafted players from user_players table
DELETE FROM user_players 
WHERE purchase_price = 0 AND bot_id IS NULL;

-- Step 3set all users coin balances to starting amount (50 coins)
UPDATE league_coin_balances 
SET coin_balance = 50ERE bot_id IS NULL;

-- Step 4ransaction records for the reset
INSERT INTO coin_transactions (
  user_id, 
  bot_id, 
  league_id, 
  amount, 
  transaction_type, 
  description,
  created_at
)
SELECT 
  lcb.user_id,
  lcb.bot_id,
  lcb.league_id,
 50as amount,join_bonus' as transaction_type,
  'Initial coin balance for marketplace-only league as description,
  NOW() as created_at
FROM league_coin_balances lcb
WHERE lcb.bot_id IS NULL; 