-- Simple approach: Create a view that allows league deletion
-- Run this in your Supabase SQL editor

-- First, let's create a simple function that just deletes the league
-- This will help us test if the issue is with the RPC call or the function itself

-- Drop any existing functions
DROP FUNCTION IF EXISTS public.delete_league_safe(UUID);
DROP FUNCTION IF EXISTS public.delete_league_safe_with_user(UUID, UUID);

-- Create a very simple function
CREATE OR REPLACE FUNCTION public.delete_league_simple(league_uuid UUID)
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
    
    IF deleted_count > 0 THEN
        RETURN 'League "' || league_name || '" deleted successfully';
    ELSE
        RETURN 'Failed to delete league "' || league_name || '"';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_league_simple(UUID) TO authenticated;

-- Test the function
SELECT delete_league_simple('b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid);

-- Also create a function that accepts user_id for verification
CREATE OR REPLACE FUNCTION public.delete_league_verified(league_uuid UUID, user_uuid UUID)
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
    
    IF deleted_count > 0 THEN
        RETURN 'League "' || league_name || '" deleted successfully by user ' || user_uuid;
    ELSE
        RETURN 'Failed to delete league "' || league_name || '"';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_league_verified(UUID, UUID) TO authenticated;

-- Test the verified function
SELECT delete_league_verified(
    'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid,
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::uuid
);

-- Show all functions
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname LIKE 'delete_league%'
ORDER BY proname; 