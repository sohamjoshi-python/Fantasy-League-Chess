-- Create a delete function that temporarily disables triggers
-- Run this in your Supabase SQL editor

-- Drop the existing simple functions
DROP FUNCTION IF EXISTS public.delete_league_simple(UUID);
DROP FUNCTION IF EXISTS public.delete_league_verified(UUID, UUID);

-- Create a function that disables triggers during deletion
CREATE OR REPLACE FUNCTION public.delete_league_no_triggers(league_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    league_name TEXT;
    deleted_count INTEGER;
BEGIN
    -- Get the league name for logging
    SELECT name INTO league_name FROM leagues WHERE id = league_uuid;
    
    IF league_name IS NULL THEN
        RETURN 'League not found';
    END IF;
    
    -- Temporarily disable triggers
    SET session_replication_role = replica;
    
    -- Delete in order
    DELETE FROM marketplace_turns WHERE league_id = league_uuid;
    DELETE FROM lineups WHERE league_id = league_uuid;
    DELETE FROM teams WHERE league_id = league_uuid;
    DELETE FROM league_members WHERE league_id = league_uuid;
    DELETE FROM bots WHERE league_id = league_uuid;
    DELETE FROM league_coin_balances WHERE league_id = league_uuid;
    
    -- Delete the league and get count
    DELETE FROM leagues WHERE id = league_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
    
    IF deleted_count > 0 THEN
        RETURN 'League "' || league_name || '" deleted successfully (triggers disabled)';
    ELSE
        RETURN 'Failed to delete league "' || league_name || '"';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a verified version that also disables triggers
CREATE OR REPLACE FUNCTION public.delete_league_verified_no_triggers(league_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    league_record RECORD;
    league_name TEXT;
    deleted_count INTEGER;
BEGIN
    -- Check if league exists and user is creator
    SELECT * INTO league_record FROM leagues WHERE id = league_uuid;
    
    IF NOT FOUND THEN
        RETURN 'League not found';
    END IF;
    
    IF league_record.creator_id != user_uuid THEN
        RETURN 'Only the league creator can delete the league';
    END IF;
    
    league_name := league_record.name;
    
    -- Temporarily disable triggers
    SET session_replication_role = replica;
    
    -- Delete in order
    DELETE FROM marketplace_turns WHERE league_id = league_uuid;
    DELETE FROM lineups WHERE league_id = league_uuid;
    DELETE FROM teams WHERE league_id = league_uuid;
    DELETE FROM league_members WHERE league_id = league_uuid;
    DELETE FROM bots WHERE league_id = league_uuid;
    DELETE FROM league_coin_balances WHERE league_id = league_uuid;
    
    -- Delete the league and get count
    DELETE FROM leagues WHERE id = league_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
    
    IF deleted_count > 0 THEN
        RETURN 'League "' || league_name || '" deleted successfully by user ' || user_uuid || ' (triggers disabled)';
    ELSE
        RETURN 'Failed to delete league "' || league_name || '"';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_league_no_triggers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_league_verified_no_triggers(UUID, UUID) TO authenticated;

-- Test the function
SELECT delete_league_verified_no_triggers(
    'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid,
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid
);

-- Show all delete functions
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname LIKE 'delete_league%'
ORDER BY proname; 