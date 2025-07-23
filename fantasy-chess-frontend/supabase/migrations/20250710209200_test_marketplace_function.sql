-- Test marketplace function existence and functionality

-- Step 1: Check if start_marketplace function exists
SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'start_marketplace' THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM pg_proc 
WHERE proname = 'start_marketplace'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 2: If function doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'start_marketplace' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE NOTICE 'Creating start_marketplace function...';
        
        CREATE OR REPLACE FUNCTION start_marketplace(p_league_id UUID)
        RETURNS void AS $$
        DECLARE
            league_record RECORD;
            member_count INTEGER;
            total_turns INTEGER;
            marketplace_order UUID[];
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
            FOR i IN 0..9 LOOP
                IF i % 2 = 0 THEN
                    -- Forward order
                    marketplace_order := marketplace_order || league_record.member_ids;
                ELSE
                    -- Reverse order
                    marketplace_order := marketplace_order || array_reverse(league_record.member_ids);
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
        END;
        $$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION start_marketplace(UUID) TO authenticated;

-- Step 4: Test the function with a sample league
DO $$
DECLARE
    test_league_id UUID;
BEGIN
    -- Get a sample league to test with
    SELECT id INTO test_league_id FROM leagues LIMIT 1;
    
    IF test_league_id IS NOT NULL THEN
        RAISE NOTICE 'Testing start_marketplace function with league: %', test_league_id;
        
        -- Try to call the function
        BEGIN
            PERFORM start_marketplace(test_league_id);
            RAISE NOTICE '✅ start_marketplace function works!';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ start_marketplace function failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No leagues found to test with';
    END IF;
END $$;

-- Step 5: Verify function exists after creation
SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'start_marketplace' THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM pg_proc 
WHERE proname = 'start_marketplace'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'); 