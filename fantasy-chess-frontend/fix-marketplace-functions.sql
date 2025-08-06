-- Fix marketplace functions to not use league_owners column
-- Since ownership is tracked via teams table, we need to update or remove these functions

-- Drop the problematic functions that use league_owners
DROP FUNCTION IF EXISTS remove_league_owner_for_player(UUID, UUID);
DROP FUNCTION IF EXISTS set_league_owner_for_player(UUID, UUID, UUID);

-- Drop existing functions that need to be recreated
DROP FUNCTION IF EXISTS add_league_coins(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS initialize_league_coin_balance(UUID, UUID);

-- Create a new function for adding coins that doesn't depend on league_owners
CREATE OR REPLACE FUNCTION add_league_coins(p_user_id UUID, p_league_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Update or insert coin balance
  INSERT INTO league_coin_balances (user_id, league_id, coin_balance, created_at, updated_at)
  VALUES (p_user_id, p_league_id, p_amount, NOW(), NOW())
  ON CONFLICT (user_id, league_id)
  DO UPDATE SET 
    coin_balance = league_coin_balances.coin_balance + p_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_league_coins(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_league_coins(UUID, UUID, INTEGER) TO anon;

-- Create a function to initialize league coin balance
CREATE OR REPLACE FUNCTION initialize_league_coin_balance(p_user_id UUID, p_league_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert initial coin balance if it doesn't exist
  INSERT INTO league_coin_balances (user_id, league_id, coin_balance, created_at, updated_at)
  VALUES (p_user_id, p_league_id, 50, NOW(), NOW())
  ON CONFLICT (user_id, league_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION initialize_league_coin_balance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_league_coin_balance(UUID, UUID) TO anon; 