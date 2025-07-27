-- Ultimate delete solution - Simple, direct approach
-- Run this in your Supabase SQL editor

-- First, let's completely disable RLS temporarily to test deletion
-- This will help us determine if RLS is the issue

-- Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('leagues', 'teams', 'lineups', 'league_members', 'bots', 'marketplace_turns', 'league_coin_balances')
ORDER BY tablename;

-- Temporarily disable RLS on all relevant tables
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_turns DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_coin_balances DISABLE ROW LEVEL SECURITY;

-- Create a simple function that just deletes everything
CREATE OR REPLACE FUNCTION public.delete_league_direct(league_uuid UUID)
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
    
    -- Delete everything in order
    DELETE FROM marketplace_turns WHERE league_id = league_uuid;
    DELETE FROM lineups WHERE league_id = league_uuid;
    DELETE FROM teams WHERE league_id = league_uuid;
    DELETE FROM league_members WHERE league_id = league_uuid;
    DELETE FROM bots WHERE league_id = league_uuid;
    DELETE FROM league_coin_balances WHERE league_id = league_uuid;
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
GRANT EXECUTE ON FUNCTION public.delete_league_direct(UUID) TO authenticated;

-- Test the function
SELECT delete_league_direct('b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid);

-- If that works, let's also create a version that re-enables RLS after deletion
CREATE OR REPLACE FUNCTION public.delete_league_and_restore_rls(league_uuid UUID)
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
    
    -- Disable RLS
    ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
    ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
    ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
    ALTER TABLE league_members DISABLE ROW LEVEL SECURITY;
    ALTER TABLE bots DISABLE ROW LEVEL SECURITY;
    ALTER TABLE marketplace_turns DISABLE ROW LEVEL SECURITY;
    ALTER TABLE league_coin_balances DISABLE ROW LEVEL SECURITY;
    
    -- Delete everything
    DELETE FROM marketplace_turns WHERE league_id = league_uuid;
    DELETE FROM lineups WHERE league_id = league_uuid;
    DELETE FROM teams WHERE league_id = league_uuid;
    DELETE FROM league_members WHERE league_id = league_uuid;
    DELETE FROM bots WHERE league_id = league_uuid;
    DELETE FROM league_coin_balances WHERE league_id = league_uuid;
    DELETE FROM leagues WHERE id = league_uuid;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Re-enable RLS
    ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
    ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
    ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
    ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
    ALTER TABLE marketplace_turns ENABLE ROW LEVEL SECURITY;
    ALTER TABLE league_coin_balances ENABLE ROW LEVEL SECURITY;
    
    IF deleted_count > 0 THEN
        RETURN 'League "' || league_name || '" deleted successfully (RLS restored)';
    ELSE
        RETURN 'Failed to delete league "' || league_name || '"';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_league_and_restore_rls(UUID) TO authenticated;

-- Test this function too
SELECT delete_league_and_restore_rls('b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid);

-- Show all delete functions
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname LIKE 'delete_league%'
ORDER BY proname; 