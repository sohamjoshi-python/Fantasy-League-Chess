-- Verify the migration worked correctly

-- Check 1: How many players are now in the marketplace
SELECT 
  COUNT(*) as total_marketplace_players,
  COUNT(CASE WHEN price >=40EN 1 END) as elite_players,
  COUNT(CASE WHEN price BETWEEN 30 AND39N1 as strong_players,
  COUNT(CASE WHEN price BETWEEN 20 AND29HEN 1 END) as good_players,
  COUNT(CASE WHEN price <20EN 1 END) as other_players
FROM player_marketplace 
WHERE seller_id IS NULL;  -- System-owned players

-- Check 2: How many drafted players remain (should be 0SELECT COUNT(*) as remaining_drafted_players
FROM user_players 
WHERE purchase_price = 0 AND bot_id IS NULL;

-- Check 3: User coin balances (should all be 50
SELECT 
  user_id,
  coin_balance,
  CASE WHEN coin_balance =50HEN 'Correct ELSE 'Wrong' END as status
FROM league_coin_balances 
WHERE bot_id IS NULL;

-- Check 4: Sample of marketplace players
SELECT 
  player_username,
  player_elo,
  price,
  CASE 
    WHEN price >= 40N 'Elite'
    WHEN price >=30 THENStrong'
    WHEN price >= 20EN 'Good'
    WHEN price >= 15THEN Average'
    ELSE 'Beginner'
  END as tier
FROM player_marketplace 
WHERE seller_id IS NULL
ORDER BY player_elo DESC
LIMIT 10; 