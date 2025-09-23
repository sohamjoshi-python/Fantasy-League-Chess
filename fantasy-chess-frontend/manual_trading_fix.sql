-- Manual fix for create_trade function
-- Run this in your Supabase SQL Editor

-- Drop the function if it exists
DROP FUNCTION IF EXISTS create_trade(UUID, UUID, UUID, INTEGER);

-- Create the function with proper types
CREATE FUNCTION create_trade(
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

-- Also fix the get_trade_notifications function
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
