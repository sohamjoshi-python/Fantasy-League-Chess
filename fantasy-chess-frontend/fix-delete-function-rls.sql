-- Fix the delete_league_safe function to handle RLS issues
-- Run this in your Supabase SQL editor

-- Drop the existing function
DROP FUNCTION IF EXISTS public.delete_league_safe(UUID);

-- Create an improved version that handles RLS properly
CREATE OR REPLACE FUNCTION public.delete_league_safe(league_uuid UUID)
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
    current_user_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to delete a league';
    END IF;
    
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
    
    -- Delete related data in the correct order to avoid foreign key issues
    -- Use RPC calls to bypass RLS for deletion
    
    -- Delete marketplace turns
    DELETE FROM marketplace_turns WHERE league_id = league_uuid;
    
    -- Delete lineups
    DELETE FROM lineups WHERE league_id = league_uuid;
    
    -- Delete teams
    DELETE FROM teams WHERE league_id = league_uuid;
    
    -- Delete league members
    DELETE FROM league_members WHERE league_id = league_uuid;
    
    -- Delete bots
    DELETE FROM bots WHERE league_id = league_uuid;
    
    -- Delete league coin balances
    DELETE FROM league_coin_balances WHERE league_id = league_uuid;
    
    -- Finally delete the league
    DELETE FROM leagues WHERE id = league_uuid;
    
    RAISE NOTICE 'League % and all related data deleted successfully by user %', league_uuid, current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_league_safe(UUID) TO authenticated;

-- Verify the function was updated
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'delete_league_safe';

-- Test the function with better error handling
-- This will show more detailed information about what's happening
CREATE OR REPLACE FUNCTION public.test_delete_league_access(league_uuid UUID)
RETURNS TABLE(
    league_exists BOOLEAN,
    creator_id UUID,
    current_user_id UUID,
    is_creator BOOLEAN,
    can_delete BOOLEAN
) AS $$
DECLARE
    league_record RECORD;
    current_user_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Try to get league information
    SELECT * INTO league_record
    FROM leagues
    WHERE id = league_uuid;
    
    RETURN QUERY SELECT 
        league_record.id IS NOT NULL as league_exists,
        league_record.creator_id,
        current_user_id,
        league_record.creator_id = current_user_id as is_creator,
        league_record.creator_id = current_user_id AND current_user_id IS NOT NULL as can_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.test_delete_league_access(UUID) TO authenticated; 