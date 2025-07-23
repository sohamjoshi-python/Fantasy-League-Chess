-- Fix snake draft order in start_marketplace function
-- The current logic has issues with array indexing and round counting

-- Drop and recreate the start_marketplace function with correct snake draft logic
DROP FUNCTION IF EXISTS start_marketplace(UUID);

CREATE OR REPLACE FUNCTION start_marketplace(p_league_id UUID)
RETURNS void AS $$
DECLARE
    league_record RECORD;
    member_count INTEGER;
    total_turns INTEGER;
    marketplace_order UUID[];
    round_num INTEGER;
    player_index INTEGER;
BEGIN
    -- Get league information
    SELECT * INTO league_record FROM leagues WHERE id = p_league_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'League not found';
    END IF;
    
    -- Calculate total turns needed (10 players per member)
    member_count := array_length(league_record.member_ids, 1);
    total_turns := member_count * 10;
    
    -- Generate marketplace order (snake draft style)
    marketplace_order := '{}';
    
    -- For each round (0-9), add all players in snake order
    FOR round_num IN 0..9 LOOP
        IF round_num % 2 = 0 THEN
            -- Even rounds: forward order (1, 2, 3, ...)
            FOR player_index IN 1..member_count LOOP
                marketplace_order := marketplace_order || league_record.member_ids[player_index];
            END LOOP;
        ELSE
            -- Odd rounds: reverse order (3, 2, 1, ...)
            FOR player_index IN member_count..1 BY -1 LOOP
                marketplace_order := marketplace_order || league_record.member_ids[player_index];
            END LOOP;
        END IF;
    END LOOP;
    
    -- Update league with marketplace settings
    UPDATE leagues 
    SET 
        marketplace_started = true,
        marketplace_start_time = NOW(),
        marketplace_order = marketplace_order,
        current_marketplace_turn = 0,
        marketplace_completed = false
    WHERE id = p_league_id;
    
    -- Debug: Log the generated order
    RAISE NOTICE 'Generated marketplace order for league %: %', p_league_id, marketplace_order;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION start_marketplace(UUID) TO authenticated; 