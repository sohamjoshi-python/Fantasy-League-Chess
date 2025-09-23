-- Fix the create_trade function with proper type casting
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_trade(
    p_league_id UUID,
    p_seller_id UUID,
    p_player_id UUID,
    p_price INTEGER
)
RETURNS UUID AS $$
DECLARE
    trade_id UUID;
    league_members UUID[];
BEGIN
    -- Validate that the seller owns the player in this league
    -- Cast player_id to text for comparison with player_ids array
    IF NOT EXISTS (
        SELECT 1 FROM teams 
        WHERE league_id = p_league_id 
        AND user_id = p_seller_id 
        AND p_player_id::text = ANY(player_ids)
    ) THEN
        RAISE EXCEPTION 'Player not owned by seller in this league';
    END IF;

    -- Get league members for notifications
    SELECT member_ids INTO league_members FROM leagues WHERE id = p_league_id;

    -- Create the trade
    INSERT INTO trades (league_id, seller_id, player_id, price, expires_at)
    VALUES (p_league_id, p_seller_id, p_player_id, p_price, NOW() + INTERVAL '72 hours')
    RETURNING id INTO trade_id;

    -- Create notifications for all league members except the seller
    INSERT INTO trade_notifications (trade_id, user_id)
    SELECT trade_id, unnest(league_members)
    WHERE unnest(league_members) != p_seller_id;

    RETURN trade_id;
END;
$$ LANGUAGE plpgsql;

-- Also fix the accept_trade function with the same issue
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

    -- Start transaction
    BEGIN
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

        -- Mark notification as seen for buyer
        UPDATE trade_notifications 
        SET seen = true 
        WHERE trade_id = p_trade_id AND user_id = p_buyer_id;

        RETURN true;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Add the missing mark_notification_seen function
CREATE OR REPLACE FUNCTION mark_notification_seen(
    p_notification_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE trade_notifications 
    SET seen = true 
    WHERE id = p_notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
