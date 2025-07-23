-- Fix draft removal logic
-- This adds functions to automatically remove users from the draft when they have 0 coins or skip

-- Function to remove a user from the marketplace draft
CREATE OR REPLACE FUNCTION remove_user_from_marketplace_draft(
    p_league_id UUID,
    p_user_id UUID
)
RETURNS void AS $$
DECLARE
    current_order UUID[];
    new_order UUID[];
    user_index INTEGER;
    i INTEGER;
    new_order_length INTEGER;
BEGIN
    -- Get current marketplace order
    SELECT marketplace_order INTO current_order
    FROM leagues
    WHERE id = p_league_id
    FOR UPDATE;
    
    IF current_order IS NULL OR array_length(current_order, 1) IS NULL THEN
        RAISE NOTICE 'No marketplace order found for league %', p_league_id;
        RETURN;
    END IF;
    
    -- Find the user's position in the order
    user_index := NULL;
    FOR i IN 1..array_length(current_order, 1) LOOP
        IF current_order[i]::text = p_user_id::text THEN
            user_index := i;
            EXIT;
        END IF;
    END LOOP;
    
    IF user_index IS NULL THEN
        RAISE NOTICE 'User % not found in marketplace order for league %', p_user_id, p_league_id;
        RETURN;
    END IF;
    
    -- Remove the user from the order
    new_order := array_remove(current_order, current_order[user_index]);
    new_order_length := array_length(new_order, 1);
    
    -- Update the league with the new order
    UPDATE leagues
    SET 
        marketplace_order = new_order,
        current_marketplace_turn = CASE 
            WHEN current_marketplace_turn >= new_order_length THEN 0
            ELSE current_marketplace_turn
        END,
        draft_completed = (new_order_length <= 0)  -- Mark draft as completed, not marketplace
    WHERE id = p_league_id;
    
    RAISE NOTICE 'Removed user % from marketplace draft for league %. New order length: %. Draft completed: %', 
        p_user_id, p_league_id, new_order_length, (new_order_length <= 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and auto-remove users with 0 coins
CREATE OR REPLACE FUNCTION check_and_remove_zero_coin_users(
    p_league_id UUID
)
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Check all users in the league who have 0 coins
    FOR user_record IN 
        SELECT lcb.user_id
        FROM league_coin_balances lcb
        WHERE lcb.league_id = p_league_id 
        AND lcb.coin_balance = 0
        AND lcb.user_id IS NOT NULL
    LOOP
        -- Remove user from marketplace draft
        PERFORM remove_user_from_marketplace_draft(p_league_id, user_record.user_id);
        
        RAISE NOTICE 'Auto-removed user % from draft due to 0 coins', user_record.user_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update record_marketplace_action to handle skip removal
CREATE OR REPLACE FUNCTION record_marketplace_action(
    p_league_id UUID,
    p_user_id UUID,
    p_action_type TEXT,
    p_player_id UUID DEFAULT NULL,
    p_price INTEGER DEFAULT NULL,
    p_bot_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    current_turn INTEGER;
    existing_turn_count INTEGER;
    user_coin_balance INTEGER;
BEGIN
    -- Get current turn with lock
    SELECT current_marketplace_turn INTO current_turn
    FROM leagues 
    WHERE id = p_league_id
    FOR UPDATE;
    
    -- Check if a turn record already exists for this turn
    SELECT COUNT(*) INTO existing_turn_count
    FROM marketplace_turns 
    WHERE league_id = p_league_id 
    AND turn_number = current_turn;
    
    -- Only proceed if no turn record exists for this turn
    IF existing_turn_count = 0 THEN
        -- For buy actions, check and deduct coins
        IF p_action_type = 'buy' AND p_price IS NOT NULL AND p_price > 0 THEN
            -- Get user's current coin balance
            SELECT coin_balance INTO user_coin_balance
            FROM league_coin_balances
            WHERE user_id = p_user_id AND league_id = p_league_id;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Coin balance not found for user % in league %', p_user_id, p_league_id;
            END IF;
            
            -- Check if user has enough coins
            IF user_coin_balance < p_price THEN
                RAISE EXCEPTION 'Insufficient coins. Required: %, Available: %', p_price, user_coin_balance;
            END IF;
            
            -- Deduct coins from user's balance
            UPDATE league_coin_balances
            SET coin_balance = coin_balance - p_price,
                updated_at = NOW()
            WHERE user_id = p_user_id AND league_id = p_league_id;
            
            -- Record coin transaction
            INSERT INTO coin_transactions (
                user_id, 
                bot_id, 
                league_id, 
                transaction_type, 
                amount, 
                description
            ) VALUES (
                p_user_id,
                p_bot_id,
                p_league_id,
                'player_purchase',
                -p_price,
                'Purchased player for ' || p_price || ' coins in turn-based marketplace'
            );
            
            RAISE NOTICE 'Deducted % coins from user % for player purchase', p_price, p_user_id;
        END IF;
        
        -- Insert marketplace turn record
        INSERT INTO marketplace_turns (
            league_id,
            user_id,
            bot_id,
            turn_number,
            action_type,
            player_id,
            price
        ) VALUES (
            p_league_id,
            p_user_id,
            p_bot_id,
            current_turn,
            p_action_type,
            p_player_id,
            p_price
        );
        
        -- For skip actions, remove the user from the draft permanently
        IF p_action_type = 'skip' THEN
            PERFORM remove_user_from_marketplace_draft(p_league_id, p_user_id);
            RAISE NOTICE 'User % skipped and was removed from draft', p_user_id;
        ELSE
            -- For buy actions, check if user now has 0 coins and remove them
            IF p_action_type = 'buy' THEN
                SELECT coin_balance INTO user_coin_balance
                FROM league_coin_balances
                WHERE user_id = p_user_id AND league_id = p_league_id;
                
                IF user_coin_balance = 0 THEN
                    PERFORM remove_user_from_marketplace_draft(p_league_id, p_user_id);
                    RAISE NOTICE 'User % now has 0 coins and was removed from draft', p_user_id;
                END IF;
            END IF;
            
            -- Advance to next turn only if not a skip action
            PERFORM advance_marketplace_turn(p_league_id);
        END IF;
        
        RAISE NOTICE 'Recorded marketplace action for turn %', current_turn;
    ELSE
        RAISE EXCEPTION 'Turn % has already been recorded for league %', current_turn, p_league_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION remove_user_from_marketplace_draft(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_remove_zero_coin_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_marketplace_action(UUID, UUID, TEXT, UUID, INTEGER, UUID) TO authenticated; 