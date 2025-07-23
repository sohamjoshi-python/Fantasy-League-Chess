-- Fix sell functions for league-specific coin system

-- Update sell_player_to_system function
CREATE OR REPLACE FUNCTION sell_player_to_system(
    p_user_id UUID DEFAULT NULL,
    p_bot_id UUID DEFAULT NULL,
    p_league_id UUID DEFAULT NULL,
    p_player_username TEXT DEFAULT 
)
RETURNS BOOLEAN AS $$
DECLARE
    v_player_record RECORD;
    v_refund_amount INTEGER;
    v_current_balance INTEGER;
BEGIN
    -- Find the player in user_players
    SELECT * INTO v_player_record
    FROM user_players
    WHERE player_username = p_player_username
    AND league_id = p_league_id
    AND (
        (p_user_id IS NOT NULL AND user_id = p_user_id AND bot_id IS NULL) OR
        (p_bot_id IS NOT NULL AND bot_id = p_bot_id AND user_id IS NULL)
    )
    LIMIT 1
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate refund amount (80% of purchase price)
    v_refund_amount := FLOOR(v_player_record.purchase_price *0.8);
    
    -- Get current balance
    SELECT coin_balance INTO v_current_balance
    FROM league_coin_balances
    WHERE (user_id = p_user_id OR bot_id = p_bot_id)
    AND league_id = p_league_id;
    
    -- Begin transaction
    BEGIN
        -- Add coins to user/bot
        UPDATE league_coin_balances 
        SET coin_balance = coin_balance + v_refund_amount
        WHERE (user_id = p_user_id OR bot_id = p_bot_id)
        AND league_id = p_league_id;
        
        -- Remove player from user's/bot's collection
        DELETE FROM user_players WHERE id = v_player_record.id;
        
        -- Record transaction
        INSERT INTO coin_transactions (
            user_id, bot_id, league_id, transaction_type, amount, balance_after, description
        ) VALUES (
            p_user_id, p_bot_id, p_league_id, 'player_sale, v_refund_amount,
            v_current_balance + v_refund_amount,
      Sold ' || p_player_username || back to system (80% refund)'
        );
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update list_player_for_sale function
CREATE OR REPLACE FUNCTION list_player_for_sale(
    p_user_id UUID DEFAULT NULL,
    p_bot_id UUID DEFAULT NULL,
    p_league_id UUID DEFAULT NULL,
    p_player_username TEXT DEFAULT '',
    p_price INTEGER DEFAULT0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_player_record RECORD;
BEGIN
    -- Find the player in user_players
    SELECT * INTO v_player_record
    FROM user_players
    WHERE player_username = p_player_username
    AND league_id = p_league_id
    AND (
        (p_user_id IS NOT NULL AND user_id = p_user_id AND bot_id IS NULL) OR
        (p_bot_id IS NOT NULL AND bot_id = p_bot_id AND user_id IS NULL)
    )
    LIMIT 1
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if player is already listed
    IF EXISTS (
        SELECT 1 FROM player_marketplace 
        WHERE player_username = p_player_username
        AND league_id = p_league_id
        AND sold_at IS NULL
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Remove from user_players
    DELETE FROM user_players WHERE id = v_player_record.id;
    
    -- Add to marketplace
    INSERT INTO player_marketplace (
        player_username, 
        player_elo, 
        price, 
        seller_id, 
        seller_bot_id, 
        is_bot_seller,
        league_id
    ) VALUES (
        p_player_username,
        v_player_record.player_elo,
        p_price,
        p_user_id,
        p_bot_id,
        CASE WHEN p_bot_id IS NOT NULL THEN TRUE ELSE FALSE END,
        p_league_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the functions
SELECT Functions updated successfully!' as status; 