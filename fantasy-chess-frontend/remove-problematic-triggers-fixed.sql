-- Remove problematic triggers that are causing NULL league_id errors
-- Run this in your Supabase SQL editor

-- First, let's see what triggers exist (fixed column names)
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%draft%' OR trigger_name LIKE '%sync%' OR trigger_name LIKE '%completion%';

-- Drop ALL problematic triggers
DROP TRIGGER IF EXISTS sync_draft_completion_teams ON teams;
DROP TRIGGER IF EXISTS sync_draft_completion_marketplace_turns ON marketplace_turns;
DROP TRIGGER IF EXISTS sync_draft_completion_leagues ON leagues;

-- Drop ALL problematic functions
DROP FUNCTION IF EXISTS public.sync_draft_completion_trigger();
DROP FUNCTION IF EXISTS public.sync_draft_completion_league_trigger();
DROP FUNCTION IF EXISTS public.update_draft_completion_status(UUID);

-- Create a completely clean delete function without any triggers
CREATE OR REPLACE FUNCTION public.delete_league_clean(league_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    league_name TEXT;
    deleted_count INTEGER;
BEGIN
    -- Get the league name
    SELECT name INTO league_name FROM leagues WHERE id = league_uuid;
    
    IF league_name IS NULL THEN
        RETURN 'League not found';
    END IF;
    
    -- Disable ALL triggers temporarily
    SET session_replication_role = replica;
    
    -- Delete everything in order
    DELETE FROM marketplace_turns WHERE league_id = league_uuid;
    DELETE FROM lineups WHERE league_id = league_uuid;
    DELETE FROM teams WHERE league_id = league_uuid;
    DELETE FROM league_members WHERE league_id = league_uuid;
    DELETE FROM bots WHERE league_id = league_uuid;
    DELETE FROM league_coin_balances WHERE league_id = league_uuid;
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_league_clean(UUID) TO authenticated;

-- Test the clean function
SELECT delete_league_clean('b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid);

-- Verify no triggers exist (fixed column names)
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%draft%' OR trigger_name LIKE '%sync%' OR trigger_name LIKE '%completion%';

-- Show all delete functions
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname LIKE 'delete_league%'
ORDER BY proname; 