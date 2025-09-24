-- Essential Trading Functions Only
-- Run this if you just need the basic functions without the full comprehensive fix

-- Create get_trade_notifications function (the one causing the error)
CREATE OR REPLACE FUNCTION get_trade_notifications(
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tn.id as notification_id,
        tn.trade_id,
        u.username as seller_name,
        cp.name as player_name,
        cp.elo as player_elo,
        t.price,
        tn.created_at,
        tn.seen
    FROM trade_notifications tn
    JOIN trades t ON tn.trade_id = t.id
    JOIN users u ON t.seller_id = u.id
    JOIN chess_players cp ON t.player_id = cp.id
    WHERE tn.user_id = p_user_id
    AND t.league_id = p_league_id
    ORDER BY tn.created_at DESC;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_trade_notifications(UUID, UUID) TO authenticated;
