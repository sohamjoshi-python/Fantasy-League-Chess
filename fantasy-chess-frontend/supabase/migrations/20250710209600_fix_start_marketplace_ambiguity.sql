-- Fix ambiguity in start_marketplace function
CREATE OR REPLACE FUNCTION start_marketplace(p_league_id UUID)
RETURNS void AS $$
DECLARE
    league_record RECORD;
    member_count INTEGER;
    total_turns INTEGER;
    marketplace_order_var UUID[];
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
    marketplace_order_var := '{}';
    FOR i IN 0..9 LOOP
        IF i % 2 = 0 THEN
            -- Forward order
            marketplace_order_var := marketplace_order_var || league_record.member_ids;
        ELSE
            -- Reverse order
            marketplace_order_var := marketplace_order_var || array_reverse(league_record.member_ids);
        END IF;
    END LOOP;
    
    -- Update league with marketplace settings
    UPDATE leagues 
    SET 
        marketplace_started = true,
        marketplace_start_time = NOW(),
        marketplace_order = marketplace_order_var,
        current_marketplace_turn = 0,
        marketplace_completed = false
    WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION start_marketplace(UUID) TO authenticated; 