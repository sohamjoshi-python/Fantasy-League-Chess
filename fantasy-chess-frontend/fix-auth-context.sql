-- Fix the authentication context issue in delete_league_safe function
-- Run this in your Supabase SQL editor

-- Drop the existing function
DROP FUNCTION IF EXISTS public.delete_league_safe(UUID);

-- Create a fixed version that handles authentication context properly
CREATE OR REPLACE FUNCTION public.delete_league_safe(league_uuid UUID)
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
    current_user_id UUID;
BEGIN
    -- Get the current user ID - try multiple methods
    current_user_id := auth.uid();
    
    -- If auth.uid() returns NULL, try to get it from the JWT
    IF current_user_id IS NULL THEN
        current_user_id := (auth.jwt() ->> 'sub')::uuid;
    END IF;
    
    -- If still NULL, try to get it from the request headers
    IF current_user_id IS NULL THEN
        current_user_id := (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid;
    END IF;
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to delete a league. auth.uid() returned NULL';
    END IF;
    
    -- Check if league_uuid is NULL
    IF league_uuid IS NULL THEN
        RAISE EXCEPTION 'League UUID cannot be NULL';
    END IF;
    
    -- Log authentication info
    RAISE NOTICE 'Authentication check - User ID: %, League UUID: %', current_user_id, league_uuid;
    
    -- Get league information with RLS bypass for checking
    SELECT * INTO league_record
    FROM leagues
    WHERE id = league_uuid;
    
    -- Check if league exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'League with ID % not found', league_uuid;
    END IF;
    
    -- Check if user is the creator (bypass RLS for this check)
    IF league_record.creator_id != current_user_id THEN
        RAISE EXCEPTION 'Only the league creator can delete the league. Creator ID: %, Current User: %', 
            league_record.creator_id, current_user_id;
    END IF;
    
    -- Log the operation
    RAISE NOTICE 'Starting deletion of league % by user %', league_uuid, current_user_id;
    
    -- Delete related data in the correct order to avoid foreign key issues
    -- Delete marketplace turns
    DELETE FROM marketplace_turns WHERE league_id = league_uuid;
    RAISE NOTICE 'Deleted marketplace turns for league %', league_uuid;
    
    -- Delete lineups
    DELETE FROM lineups WHERE league_id = league_uuid;
    RAISE NOTICE 'Deleted lineups for league %', league_uuid;
    
    -- Delete teams
    DELETE FROM teams WHERE league_id = league_uuid;
    RAISE NOTICE 'Deleted teams for league %', league_uuid;
    
    -- Delete league members
    DELETE FROM league_members WHERE league_id = league_uuid;
    RAISE NOTICE 'Deleted league members for league %', league_uuid;
    
    -- Delete bots
    DELETE FROM bots WHERE league_id = league_uuid;
    RAISE NOTICE 'Deleted bots for league %', league_uuid;
    
    -- Delete league coin balances
    DELETE FROM league_coin_balances WHERE league_id = league_uuid;
    RAISE NOTICE 'Deleted coin balances for league %', league_uuid;
    
    -- Finally delete the league
    DELETE FROM leagues WHERE id = league_uuid;
    RAISE NOTICE 'Deleted league %', league_uuid;
    
    RAISE NOTICE 'League % and all related data deleted successfully by user %', league_uuid, current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_league_safe(UUID) TO authenticated;

-- Also create a simpler version that accepts user_id as parameter
CREATE OR REPLACE FUNCTION public.delete_league_safe_with_user(league_uuid UUID, user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
BEGIN
    -- Check if league_uuid is NULL
    IF league_uuid IS NULL THEN
        RAISE EXCEPTION 'League UUID cannot be NULL';
    END IF;
    
    -- Check if user_uuid is NULL
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User UUID cannot be NULL';
    END IF;
    
    -- Log authentication info
    RAISE NOTICE 'Delete request - User ID: %, League UUID: %', user_uuid, league_uuid;
    
    -- Get league information
    SELECT * INTO league_record
    FROM leagues
    WHERE id = league_uuid;
    
    -- Check if league exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'League with ID % not found', league_uuid;
    END IF;
    
    -- Check if user is the creator
    IF league_record.creator_id != user_uuid THEN
        RAISE EXCEPTION 'Only the league creator can delete the league. Creator ID: %, Requested User: %', 
            league_record.creator_id, user_uuid;
    END IF;
    
    -- Log the operation
    RAISE NOTICE 'Starting deletion of league % by user %', league_uuid, user_uuid;
    
    -- Delete related data in the correct order
    DELETE FROM marketplace_turns WHERE league_id = league_uuid;
    DELETE FROM lineups WHERE league_id = league_uuid;
    DELETE FROM teams WHERE league_id = league_uuid;
    DELETE FROM league_members WHERE league_id = league_uuid;
    DELETE FROM bots WHERE league_id = league_uuid;
    DELETE FROM league_coin_balances WHERE league_id = league_uuid;
    DELETE FROM leagues WHERE id = league_uuid;
    
    RAISE NOTICE 'League % and all related data deleted successfully by user %', league_uuid, user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_league_safe_with_user(UUID, UUID) TO authenticated;

-- Test the functions
SELECT 'Functions created successfully' as status;

-- Show function details
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname LIKE 'delete_league_safe%'
ORDER BY proname; 