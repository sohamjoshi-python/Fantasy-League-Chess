-- Fix coin deduction in record_marketplace_action function
-- This adds coin deduction when buying players in the turn-based marketplace

-- Drop and recreate the record_marketplace_action function with coin deduction
DROP FUNCTION IF EXISTS record_marketplace_action(UUID, UUID, TEXT, UUID, INTEGER, UUID);

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
        
        -- Advance to next turn
        PERFORM advance_marketplace_turn(p_league_id);
        
        RAISE NOTICE 'Recorded marketplace action for turn % and advanced to next turn', current_turn;
    ELSE
        RAISE EXCEPTION 'Turn % has already been recorded for league %', current_turn, p_league_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION record_marketplace_action(UUID, UUID, TEXT, UUID, INTEGER, UUID) TO authenticated;

-- Test the function
DO $$
DECLARE
    test_league_id UUID;
    test_user_id UUID;
BEGIN
    -- Get a test league and user
    SELECT l.id, l.member_ids[1] INTO test_league_id, test_user_id
    FROM leagues l
    WHERE l.marketplace_started = true 
    AND array_length(l.member_ids, 1) > 0
    LIMIT 1;
    
    IF test_league_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing record_marketplace_action with league % and user %', test_league_id, test_user_id;
    END IF;
END $$; 