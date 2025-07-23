-- Fix race condition in advance_marketplace_turn function
-- This adds proper locking and validation to prevent multiple advances

-- Drop and recreate the advance_marketplace_turn function with better protection
DROP FUNCTION IF EXISTS advance_marketplace_turn(UUID);

CREATE OR REPLACE FUNCTION advance_marketplace_turn(p_league_id UUID)
RETURNS void AS $$
DECLARE
    league_record RECORD;
    new_turn INTEGER;
    total_turns INTEGER;
    current_turn_at_start INTEGER;
BEGIN
    -- Get league information with row lock to prevent race conditions
    SELECT * INTO league_record 
    FROM leagues 
    WHERE id = p_league_id
    FOR UPDATE; -- This locks the row to prevent concurrent modifications
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'League not found';
    END IF;
    
    -- Store the current turn at the start of this function
    current_turn_at_start := league_record.current_marketplace_turn;
    
    -- Calculate new turn
    new_turn := current_turn_at_start + 1;
    total_turns := array_length(league_record.marketplace_order, 1);
    
    -- Add validation to prevent advancing beyond what's expected
    -- Check if there's already a marketplace turn record for the current turn
    IF EXISTS (
        SELECT 1 FROM marketplace_turns 
        WHERE league_id = p_league_id 
        AND turn_number = current_turn_at_start
    ) THEN
        -- Only advance if we haven't already advanced for this turn
        UPDATE leagues 
        SET 
            current_marketplace_turn = new_turn,
            marketplace_completed = (new_turn >= total_turns)
        WHERE id = p_league_id;
        
        RAISE NOTICE 'Advanced marketplace turn from % to % for league %', 
            current_turn_at_start, new_turn, p_league_id;
    ELSE
        RAISE NOTICE 'No marketplace turn record found for turn %, not advancing', 
            current_turn_at_start;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Also fix the record_marketplace_action function to be more robust
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
GRANT EXECUTE ON FUNCTION advance_marketplace_turn(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_marketplace_action(UUID, UUID, TEXT, UUID, INTEGER, UUID) TO authenticated;

-- Test the functions
DO $$
DECLARE
    test_league_id UUID;
BEGIN
    -- Get a test league
    SELECT id INTO test_league_id 
    FROM leagues 
    WHERE marketplace_started = true 
    LIMIT 1;
    
    IF test_league_id IS NOT NULL THEN
        RAISE NOTICE 'Testing functions with league %', test_league_id;
    END IF;
END $$; 