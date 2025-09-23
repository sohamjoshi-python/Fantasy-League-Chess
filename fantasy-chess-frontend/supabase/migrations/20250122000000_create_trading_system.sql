-- Create Trading System Migration
-- This migration adds the complete trading system to Fantasy Chess

-- Step 1: Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id UUID REFERENCES chess_players(id) ON DELETE CASCADE NOT NULL,
    price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '72 hours'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Create trade_notifications table for popup notifications
CREATE TABLE IF NOT EXISTS trade_notifications (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    seen BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_league_id ON trades(league_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_expires_at ON trades(expires_at);
CREATE INDEX IF NOT EXISTS idx_trade_notifications_user_id ON trade_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_notifications_seen ON trade_notifications(seen);

-- Step 4: Create function to create a trade
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

-- Step 5: Create function to accept a trade
CREATE OR REPLACE FUNCTION accept_trade(
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

    -- Check if buyer has enough coins
    SELECT coin_balance INTO buyer_coins FROM users WHERE id = p_buyer_id;
    
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

        -- Transfer coins
        UPDATE users 
        SET coin_balance = coin_balance - trade_record.price
        WHERE id = p_buyer_id;

        UPDATE users 
        SET coin_balance = coin_balance + trade_record.price
        WHERE id = trade_record.seller_id;

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

-- Step 6: Create function to cancel a trade
CREATE OR REPLACE FUNCTION cancel_trade(
    p_trade_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    trade_record RECORD;
BEGIN
    -- Get trade details
    SELECT * INTO trade_record FROM trades WHERE id = p_trade_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trade not found or not pending';
    END IF;

    -- Check if user is the seller
    IF trade_record.seller_id != p_user_id THEN
        RAISE EXCEPTION 'Only the seller can cancel the trade';
    END IF;

    -- Update trade status
    UPDATE trades 
    SET status = 'cancelled', cancelled_at = NOW()
    WHERE id = p_trade_id;

    -- Mark all notifications as seen
    UPDATE trade_notifications 
    SET seen = true 
    WHERE trade_id = p_trade_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to expire old trades
CREATE OR REPLACE FUNCTION expire_old_trades()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired trades
    UPDATE trades 
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    -- Return players to original owners
    UPDATE teams 
    SET player_ids = array_append(player_ids, trades.player_id)
    FROM trades
    WHERE teams.league_id = trades.league_id 
    AND teams.user_id = trades.seller_id
    AND trades.status = 'expired'
    AND NOT (trades.player_id = ANY(teams.player_ids));

    -- Mark notifications as seen
    UPDATE trade_notifications 
    SET seen = true 
    WHERE trade_id IN (
        SELECT id FROM trades WHERE status = 'expired'
    );

    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to get user's pending trades
CREATE OR REPLACE FUNCTION get_user_trades(
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

-- Step 9: Create function to get trade notifications for a user
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
    created_at TIMESTAMP WITH TIME ZONE
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
        t.created_at
    FROM trade_notifications tn
    JOIN trades t ON tn.trade_id = t.id
    JOIN users u ON t.seller_id = u.id
    JOIN chess_players cp ON t.player_id = cp.id
    WHERE tn.user_id = p_user_id 
    AND t.league_id = p_league_id
    AND tn.seen = false
    AND t.status = 'pending'
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create function to mark notification as seen
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

-- Step 11: Create scheduled function to expire trades (run every hour)
-- This would typically be set up as a cron job or scheduled function
CREATE OR REPLACE FUNCTION cleanup_expired_trades()
RETURNS void AS $$
BEGIN
    PERFORM expire_old_trades();
END;
$$ LANGUAGE plpgsql;
