-- Fix the create_trade function to avoid set-returning functions in WHERE
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
    member_id UUID;
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
    -- Use a loop instead of set-returning function in WHERE
    IF league_members IS NOT NULL THEN
        FOREACH member_id IN ARRAY league_members
        LOOP
            IF member_id != p_seller_id THEN
                INSERT INTO trade_notifications (trade_id, user_id)
                VALUES (trade_id, member_id);
            END IF;
        END LOOP;
    END IF;

    RETURN trade_id;
END;
$$ LANGUAGE plpgsql;
