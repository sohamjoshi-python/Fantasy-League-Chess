-- Check what transaction types are currently allowed
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = coin_transactions::regclass 
  AND contype = 'c';

-- Check existing transaction types in the table
SELECT DISTINCT transaction_type FROM coin_transactions ORDER BY transaction_type;

-- Fix Step 6: Use a valid transaction type
INSERT INTO coin_transactions (user_id, bot_id, league_id, amount, transaction_type, description, created_at)
SELECT 
  lcb.user_id,
  lcb.bot_id,
  lcb.league_id,
 50 as amount,
  'bonus' as transaction_type,  -- Changed fromjoin_bonus' to bonus'
  'Initial coin balance for marketplace-only league as description,
  NOW() as created_at
FROM league_coin_balances lcb
WHERE lcb.bot_id IS NULL; 