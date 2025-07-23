-- Drop existing functions first
DROP FUNCTION IF EXISTS sell_player_back_to_system(TEXT, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS list_player_on_marketplace(TEXT, INTEGER, INTEGER, UUID, UUID, UUID);

-- Function to sell player back to the system (80 refund)
CREATE OR REPLACE FUNCTION sell_player_back_to_system(
  p_player_username TEXT,
  p_seller_id UUID,
  p_seller_bot_id UUID DEFAULT NULL,
  p_league_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_player_record RECORD;
  v_refund_amount INTEGER;
BEGIN
  -- Get the player record (now all players can be sold)
  SELECT * INTO v_player_record
  FROM user_players
  WHERE player_username = p_player_username
    AND user_id = p_seller_id
    AND bot_id = p_seller_bot_id
    AND league_id = p_league_id;

  IF NOT FOUND THEN
    RAISE EXCEPTIONPlayer not found;
  END IF;

  -- Calculate refund amount (80% of purchase price, minimum 10 coins for initial players)
  v_refund_amount := GREATEST(FLOOR((COALESCE(v_player_record.purchase_price, 25) *0.810;

  -- Delete the player from user_players
  DELETE FROM user_players
  WHERE id = v_player_record.id;

  -- Update coin balance
  UPDATE league_coin_balances
  SET coin_balance = coin_balance + v_refund_amount
  WHERE user_id = p_seller_id
    AND bot_id = p_seller_bot_id
    AND league_id = p_league_id;

  -- Record the transaction
  INSERT INTO coin_transactions (
    user_id, bot_id, league_id, amount, transaction_type, description
  ) VALUES (
    p_seller_id, p_seller_bot_id, p_league_id, v_refund_amount, player_sale',
    'Sold ' || p_player_username || ' for ' || v_refund_amount || ' coins (80% refund)'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list player on marketplace for sale
CREATE OR REPLACE FUNCTION list_player_on_marketplace(
  p_player_username TEXT,
  p_player_elo INTEGER,
  p_price INTEGER,
  p_seller_id UUID,
  p_seller_bot_id UUID DEFAULT NULL,
  p_league_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_player_record RECORD;
BEGIN
  -- Get the player record (now all players can be sold)
  SELECT * INTO v_player_record
  FROM user_players
  WHERE player_username = p_player_username
    AND user_id = p_seller_id
    AND bot_id = p_seller_bot_id
    AND league_id = p_league_id;

  IF NOT FOUND THEN
    RAISE EXCEPTIONPlayer not found;
  END IF;

  -- Delete the player from user_players
  DELETE FROM user_players
  WHERE id = v_player_record.id;

  -- Add to marketplace
  INSERT INTO player_marketplace (
    player_username, player_elo, price, seller_id, seller_bot_id, league_id, is_bot_seller
  ) VALUES (
    p_player_username, p_player_elo, p_price, p_seller_id, p_seller_bot_id, p_league_id,
    CASE WHEN p_seller_bot_id IS NOT NULL THEN TRUE ELSE FALSE END
  );

  -- Record the transaction
  INSERT INTO coin_transactions (
    user_id, bot_id, league_id, amount, transaction_type, description
  ) VALUES (
    p_seller_id, p_seller_bot_id, p_league_id,0, 'player_sale', 
Listed ' || p_player_username || for sale at ||p_price || ' coins'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 