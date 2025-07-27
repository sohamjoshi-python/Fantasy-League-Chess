-- Fix the trigger issue that's causing NULL league_id errors
-- Run this in your Supabase SQL editor

-- First, let's check what triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%draft%' OR trigger_name LIKE '%sync%';

-- Drop the problematic triggers
DROP TRIGGER IF EXISTS sync_draft_completion_teams ON teams;
DROP TRIGGER IF EXISTS sync_draft_completion_marketplace_turns ON marketplace_turns;
DROP TRIGGER IF EXISTS sync_draft_completion_leagues ON leagues;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS public.sync_draft_completion_trigger();
DROP FUNCTION IF EXISTS public.sync_draft_completion_league_trigger();
DROP FUNCTION IF EXISTS public.update_draft_completion_status(UUID);

-- Now create a fixed version of the update function
CREATE OR REPLACE FUNCTION public.update_draft_completion_status(league_uuid UUID)
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
    team_count INTEGER;
    member_count INTEGER;
BEGIN
    -- Check if league_uuid is NULL
    IF league_uuid IS NULL THEN
        RAISE NOTICE 'update_draft_completion_status called with NULL league_uuid - skipping';
        RETURN;
    END IF;
    
    -- Get league information
    SELECT * INTO league_record FROM leagues WHERE id = league_uuid;
    
    -- Check if league exists
    IF NOT FOUND THEN
        RAISE NOTICE 'League with ID % not found in update_draft_completion_status', league_uuid;
        RETURN;
    END IF;
    
    -- Count teams for this league
    SELECT COUNT(*) INTO team_count FROM teams WHERE league_id = league_uuid;
    
    -- Count members in the league
    member_count := array_length(league_record.member_ids, 1);
    
    -- Update draft completion status based on team count vs member count
    IF team_count >= member_count AND member_count > 0 THEN
        UPDATE leagues 
        SET draft_completed = true, 
            marketplace_completed = true,
            updated_at = NOW()
        WHERE id = league_uuid;
        RAISE NOTICE 'League % marked as draft completed (teams: %, members: %)', league_uuid, team_count, member_count;
    ELSE
        UPDATE leagues 
        SET draft_completed = false, 
            marketplace_completed = false,
            updated_at = NOW()
        WHERE id = league_uuid;
        RAISE NOTICE 'League % marked as draft not completed (teams: %, members: %)', league_uuid, team_count, member_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a fixed trigger function that handles NULL values
CREATE OR REPLACE FUNCTION public.sync_draft_completion_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT operations
    IF TG_OP = 'INSERT' THEN
        IF NEW.league_id IS NOT NULL THEN
            PERFORM public.update_draft_completion_status(NEW.league_id);
        END IF;
        RETURN NEW;
    END IF;
    
    -- For UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        IF NEW.league_id IS NOT NULL THEN
            PERFORM public.update_draft_completion_status(NEW.league_id);
        END IF;
        RETURN NEW;
    END IF;
    
    -- For DELETE operations
    IF TG_OP = 'DELETE' THEN
        IF OLD.league_id IS NOT NULL THEN
            PERFORM public.update_draft_completion_status(OLD.league_id);
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a fixed league trigger function
CREATE OR REPLACE FUNCTION public.sync_draft_completion_league_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- For UPDATE operations on leagues
    IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS NOT NULL THEN
            PERFORM public.update_draft_completion_status(NEW.id);
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers with the fixed functions
CREATE TRIGGER sync_draft_completion_teams 
    AFTER INSERT OR UPDATE OR DELETE ON teams 
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_draft_completion_trigger();

CREATE TRIGGER sync_draft_completion_marketplace_turns 
    AFTER INSERT OR UPDATE OR DELETE ON marketplace_turns 
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_draft_completion_trigger();

CREATE TRIGGER sync_draft_completion_leagues 
    AFTER UPDATE ON leagues 
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_draft_completion_league_trigger();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_draft_completion_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_draft_completion_trigger() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_draft_completion_league_trigger() TO authenticated;

-- Test the fixed function
SELECT public.update_draft_completion_status('b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid);

-- Show the updated triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%draft%' OR trigger_name LIKE '%sync%'; 