-- Check what's in the league_coin_balances table
SELECT * FROM league_coin_balances;

-- Check if there are any users in the league
SELECT 
  u.id as user_id,
  u.email,
  l.id as league_id,
  l.name as league_name
FROM users u
JOIN league_members lm ON u.id = lm.user_id
JOIN leagues l ON lm.league_id = l.id
WHERE l.id =YOUR_LEAGUE_ID_HERE';  -- Replace with your actual league ID

-- Check if coin balance records exist for users
SELECT 
  u.id as user_id,
  u.email,
  lcb.coin_balance,
  CASE WHEN lcb.user_id IS NULL THEN 'Missing' ELSE 'Exists' END as balance_status
FROM users u
JOIN league_members lm ON u.id = lm.user_id
JOIN leagues l ON lm.league_id = l.id
LEFT JOIN league_coin_balances lcb ON u.id = lcb.user_id AND l.id = lcb.league_id
WHERE l.id =YOUR_LEAGUE_ID_HERE';  -- Replace with your actual league ID

-- Initialize coin balances for all users in the league
INSERT INTO league_coin_balances (user_id, bot_id, league_id, coin_balance, created_at)
SELECT 
  u.id as user_id,
  NULL as bot_id,
  l.id as league_id,
  50 as coin_balance,
  NOW() as created_at
FROM users u
JOIN league_members lm ON u.id = lm.user_id
JOIN leagues l ON lm.league_id = l.id
WHERE l.id =YOUR_LEAGUE_ID_HERE  -- Replace with your actual league ID
  AND NOT EXISTS (
    SELECT 1 FROM league_coin_balances lcb 
    WHERE lcb.user_id = u.id AND lcb.league_id = l.id
  );

-- Add transaction records for the initialization
INSERT INTO coin_transactions (user_id, bot_id, league_id, amount, transaction_type, description, created_at)
SELECT 
  lcb.user_id,
  lcb.bot_id,
  lcb.league_id,
 50as amount,join_bonus' as transaction_type,
  'Initial coin balance for marketplace-only league as description,
  NOW() as created_at
FROM league_coin_balances lcb
WHERE lcb.league_id =YOUR_LEAGUE_ID_HERE  -- Replace with your actual league ID
  AND lcb.bot_id IS NULL; 