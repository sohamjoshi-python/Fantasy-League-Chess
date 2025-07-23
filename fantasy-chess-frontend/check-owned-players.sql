-- Check owned players and their purchase prices
SELECT 
  player_username,
  player_elo,
  purchase_price,
  purchased_at,
  CASE 
    WHEN purchase_price =0THEN Drafted'
    ELSEPurchased'
  END as player_type
FROM user_players 
WHERE user_id = YOUR_USER_ID_HERE  -- Replace with your actual user ID
  AND league_id =YOUR_LEAGUE_ID_HERE  -- Replace with your actual league ID
  AND bot_id IS NULL
ORDER BY purchase_price DESC, player_elo DESC; 