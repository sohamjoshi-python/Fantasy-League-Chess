-- Fix Trading System User References
-- This migration fixes the user table references in the trading functions

-- Update create_trade function to use users table for notifications
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
    IF NOT EXISTS (
        SELECT 1 FROM teams 
        WHERE league_id = p_league_id 
        AND user_id = p_seller_id 
        AND p_player_id = ANY(player_ids)
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

-- Drop and recreate get_trade_notifications function to use users table
DROP FUNCTION IF EXISTS get_trade_notifications(UUID, UUID);

CREATE FUNCTION get_trade_notifications(
    p_user_id UUID,
    p_league_id UUID
)
RETURNS TABLE (
    notification_id UUID,
    trade_id UUID,
    seller_name TEXT,
    player_name TEXT,
    player_elo INTEGER,
    price INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    seen BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tn.id as notification_id,
        t.id as trade_id,
        u.username as seller_name,
        cp.name as player_name,
        cp.elo as player_elo,
        t.price,
        t.created_at,
        tn.seen
    FROM trade_notifications tn
    JOIN trades t ON tn.trade_id = t.id
    JOIN users u ON t.seller_id = u.id
    JOIN chess_players cp ON t.player_id = cp.id
    WHERE tn.user_id = p_user_id 
    AND t.league_id = p_league_id
    AND t.status = 'pending'
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate get_user_trades function to use users table
DROP FUNCTION IF EXISTS get_user_trades(UUID, UUID);

CREATE FUNCTION get_user_trades(
    p_user_id UUID,
    p_league_id UUID
)
RETURNS TABLE (
    trade_id UUID,
    player_name TEXT,
    player_elo INTEGER,
    price INTEGER,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_seller BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as trade_id,
        cp.name as player_name,
        cp.elo as player_elo,
        t.price,
        t.status,
        t.created_at,
        t.expires_at,
        (t.seller_id = p_user_id) as is_seller
    FROM trades t
    JOIN chess_players cp ON t.player_id = cp.id
    WHERE t.league_id = p_league_id 
    AND (t.seller_id = p_user_id OR t.buyer_id = p_user_id)
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate accept_trade function to use league_coin_balances
DROP FUNCTION IF EXISTS accept_trade(UUID, UUID);

CREATE FUNCTION accept_trade(
    p_trade_id UUID,
    p_buyer_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    trade_record RECORD;
    buyer_coins INTEGER;
    seller_coins INTEGER;
BEGIN
    -- Get trade details
    SELECT * INTO trade_record FROM trades WHERE id = p_trade_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trade not found or not pending';
    END IF;

    -- Check if buyer has enough coins (using league_coin_balances table)
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

        -- Remove player from seller's team
        UPDATE teams 
        SET player_ids = array_remove(player_ids, trade_record.player_id)
        WHERE league_id = trade_record.league_id AND user_id = trade_record.seller_id;

        -- Add player to buyer's team
        UPDATE teams 
        SET player_ids = array_append(player_ids, trade_record.player_id)
        WHERE league_id = trade_record.league_id AND user_id = p_buyer_id;

        -- Transfer coins using league_coin_balances
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
