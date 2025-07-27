-- Create a function to ensure consistent draft completion status
-- Run this in your Supabase SQL editor

-- Function to update draft completion status consistently
CREATE OR REPLACE FUNCTION public.update_draft_completion_status(league_uuid UUID)
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
    member_count INTEGER;
    team_count INTEGER;
    marketplace_turn_count INTEGER;
    should_be_completed BOOLEAN := false;
BEGIN
    -- Get league information
    SELECT 
        l.*,
        array_length(l.member_ids, 1) as member_count,
        (SELECT COUNT(*) FROM teams t WHERE t.league_id = l.id) as team_count,
        (SELECT COUNT(*) FROM marketplace_turns WHERE league_id = l.id) as marketplace_turn_count
    INTO league_record
    FROM leagues l
    WHERE l.id = league_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'League with ID % not found', league_uuid;
    END IF;
    
    -- Determine if draft should be completed
    should_be_completed := 
        league_record.marketplace_completed = true
        OR (league_record.marketplace_started = true AND league_record.current_marketplace_turn > 0)
        OR (
            league_record.team_count = league_record.member_count 
            AND league_record.member_count > 0
        );
    
    -- Update draft_completed if needed
    IF should_be_completed AND NOT league_record.draft_completed THEN
        UPDATE leagues 
        SET draft_completed = true,
            updated_at = NOW()
        WHERE id = league_uuid;
        
        RAISE NOTICE 'Marked league % as draft completed', league_uuid;
    ELSIF NOT should_be_completed AND league_record.draft_completed THEN
        UPDATE leagues 
        SET draft_completed = false,
            updated_at = NOW()
        WHERE id = league_uuid;
        
        RAISE NOTICE 'Marked league % as draft not completed', league_uuid;
    ELSE
        RAISE NOTICE 'League % draft completion status is already correct', league_uuid;
    END IF;
    
    -- Also check marketplace completion
    IF league_record.marketplace_started 
       AND NOT league_record.marketplace_completed
       AND league_record.current_marketplace_turn >= array_length(league_record.marketplace_order, 1)
       AND array_length(league_record.marketplace_order, 1) > 0 THEN
        
        UPDATE leagues 
        SET marketplace_completed = true,
            updated_at = NOW()
        WHERE id = league_uuid;
        
        RAISE NOTICE 'Marked league % as marketplace completed', league_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_draft_completion_status(UUID) TO authenticated;

-- Create a trigger function to automatically sync draft completion
CREATE OR REPLACE FUNCTION public.sync_draft_completion_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the update function when teams or marketplace_turns change
    PERFORM public.update_draft_completion_status(NEW.league_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically sync draft completion
DROP TRIGGER IF EXISTS sync_draft_completion_teams ON teams;
CREATE TRIGGER sync_draft_completion_teams
    AFTER INSERT OR UPDATE OR DELETE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_draft_completion_trigger();

DROP TRIGGER IF EXISTS sync_draft_completion_marketplace_turns ON marketplace_turns;
CREATE TRIGGER sync_draft_completion_marketplace_turns
    AFTER INSERT OR UPDATE OR DELETE ON marketplace_turns
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_draft_completion_trigger();

-- Create trigger for league updates
CREATE OR REPLACE FUNCTION public.sync_draft_completion_league_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the update function when league marketplace status changes
    IF OLD.marketplace_completed IS DISTINCT FROM NEW.marketplace_completed
       OR OLD.current_marketplace_turn IS DISTINCT FROM NEW.current_marketplace_turn
       OR OLD.marketplace_started IS DISTINCT FROM NEW.marketplace_started THEN
        PERFORM public.update_draft_completion_status(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_draft_completion_leagues ON leagues;
CREATE TRIGGER sync_draft_completion_leagues
    AFTER UPDATE ON leagues
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_draft_completion_league_trigger();

-- Function to sync all leagues
CREATE OR REPLACE FUNCTION public.sync_all_draft_completion()
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
BEGIN
    FOR league_record IN 
        SELECT id FROM leagues
    LOOP
        PERFORM public.update_draft_completion_status(league_record.id);
    END LOOP;
    
    RAISE NOTICE 'Synced draft completion status for all leagues';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sync_all_draft_completion() TO authenticated;

-- Verify functions were created
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN ('update_draft_completion_status', 'sync_all_draft_completion')
ORDER BY proname; 