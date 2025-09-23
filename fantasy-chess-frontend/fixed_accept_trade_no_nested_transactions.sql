-- Fixed accept_trade function without nested transactions
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION accept_trade(
    p_trade_id UUID,
    p_buyer_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    trade_record RECORD;
    buyer_coins INTEGER;
BEGIN
    -- Get trade details
    SELECT * INTO trade_record FROM trades WHERE id = p_trade_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trade not found or not pending';
    END IF;

    -- Check if buyer has enough coins
    SELECT coin_balance INTO buyer_coins 
    FROM league_coin_balances 
    WHERE user_id = p_buyer_id AND league_id = trade_record.league_id;
    
    IF buyer_coins < trade_record.price THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    -- Check if buyer has space in their team (max 10 players)
    IF (
        SELECT array_length(player_ids, 1) 
        FROM teams 
        WHERE league_id = trade_record.league_id AND user_id = p_buyer_id
    ) >= 10 THEN
        RAISE EXCEPTION 'Team is full (max 10 players)';
    END IF;

    -- Update trade status
    UPDATE trades 
    SET status = 'accepted', buyer_id = p_buyer_id, accepted_at = NOW()
    WHERE id = p_trade_id;

    -- Remove player from seller's team (cast to text)
    UPDATE teams 
    SET player_ids = array_remove(player_ids, trade_record.player_id::text)
    WHERE league_id = trade_record.league_id AND user_id = trade_record.seller_id;

    -- Add player to buyer's team (cast to text)
    UPDATE teams 
    SET player_ids = array_append(player_ids, trade_record.player_id::text)
    WHERE league_id = trade_record.league_id AND user_id = p_buyer_id;

    -- Transfer coins
    UPDATE league_coin_balances 
    SET coin_balance = coin_balance - trade_record.price
    WHERE user_id = p_buyer_id AND league_id = trade_record.league_id;

    UPDATE league_coin_balances 
    SET coin_balance = coin_balance + trade_record.price
    WHERE user_id = trade_record.seller_id AND league_id = trade_record.league_id;

    -- Create transaction records for both buyer and seller
    INSERT INTO coin_transactions (user_id, league_id, transaction_type, amount, description, created_at)
    VALUES 
        (p_buyer_id, trade_record.league_id, 'trade_buy', -trade_record.price, 
         'Bought player via trade', NOW()),
        (trade_record.seller_id, trade_record.league_id, 'trade_sell', trade_record.price, 
         'Sold player via trade', NOW());

    -- Mark notification as seen for buyer
    UPDATE trade_notifications 
    SET seen = true 
    WHERE trade_id = p_trade_id AND user_id = p_buyer_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;
