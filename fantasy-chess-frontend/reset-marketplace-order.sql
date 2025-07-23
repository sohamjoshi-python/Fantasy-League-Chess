-- Reset marketplace order for existing leagues
-- This will fix the snake draft order for leagues that have already started

-- First, let's see what leagues have marketplace issues
SELECT 
    id, 
    name, 
    marketplace_started, 
    current_marketplace_turn,
    array_length(marketplace_order, 1) as order_length,
    member_ids
FROM leagues 
WHERE marketplace_started = true;

-- Reset marketplace for all leagues that have started
-- This will regenerate the correct snake draft order
DO $$
DECLARE
    league_record RECORD;
BEGIN
    FOR league_record IN 
        SELECT id, name, member_ids 
        FROM leagues 
        WHERE marketplace_started = true
    LOOP
        RAISE NOTICE 'Resetting marketplace for league: % (%)', league_record.name, league_record.id;
        
        -- Call the fixed start_marketplace function
        PERFORM start_marketplace(league_record.id);
        
        RAISE NOTICE 'Successfully reset marketplace for league: %', league_record.name;
    END LOOP;
END $$;

-- Verify the fix worked
SELECT 
    id, 
    name, 
    marketplace_started, 
    current_marketplace_turn,
    array_length(marketplace_order, 1) as order_length,
    marketplace_order[1:10] as first_10_turns
FROM leagues 
WHERE marketplace_started = true; 