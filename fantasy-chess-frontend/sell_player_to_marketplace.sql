-- Drop the function if it exists
DROP FUNCTION IF EXISTS sell_player_to_marketplace(TEXT, UUID, UUID, UUID, INTEGER, INTEGER);

-- Create the function with null-safe bot_id comparison
CREATE OR REPLACE FUNCTION sell_player_to_marketplace(
  p_player_username TEXT,
  p_seller_id UUID,
  p_seller_bot_id UUID DEFAULT NULL,
  p_league_id UUID DEFAULT NULL,
  p_player_elo INTEGER DEFAULT NULL,
  p_full_price INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_player_record RECORD;
  v_refund_amount INTEGER;
BEGIN
  -- Get the player record with null-safe bot_id comparison
  SELECT * INTO v_player_record
  FROM user_players
  WHERE player_username = p_player_username
    AND user_id = p_seller_id
    AND league_id = p_league_id
    AND (
      (bot_id IS NULL AND p_seller_bot_id IS NULL)
      OR (bot_id = p_seller_bot_id)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found or not eligible for sale';
  END IF;

  -- Calculate refund amount (80% of purchase price, minimum 10 coins)
  v_refund_amount := GREATEST(FLOOR(COALESCE(v_player_record.purchase_price, p_full_price) * 0.8), 10);

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
    p_seller_id, p_seller_bot_id, p_league_id, v_refund_amount, 'player_sale',
    'Sold ' || p_player_username || ' for ' || v_refund_amount || ' coins (80% refund, relisted)'
  );

  -- Relist the player in the marketplace at full price as system-owned
  INSERT INTO player_marketplace (
    player_username, player_elo, price, seller_id, seller_bot_id, league_id, is_bot_seller, created_at
  ) VALUES (
    p_player_username, p_player_elo, p_full_price, NULL, NULL, p_league_id, FALSE, NOW()
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 