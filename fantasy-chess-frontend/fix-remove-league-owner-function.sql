-- Fix: Ensure remove_league_owner_for_player function exists
-- This function is needed for selling players to the marketplace
-- Run this manually in your Supabase SQL editor

-- Remove league owner for a player
CREATE OR REPLACE FUNCTION remove_league_owner_for_player(p_player_id UUID, p_league_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chess_players
  SET league_owners = league_owners - p_league_id::text
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set league owner for a player (also ensure this exists)
CREATE OR REPLACE FUNCTION set_league_owner_for_player(p_player_id UUID, p_league_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chess_players
  SET league_owners = COALESCE(league_owners, '{}'::jsonb) || jsonb_build_object(p_league_id::text, p_user_id::text)
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION remove_league_owner_for_player(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_league_owner_for_player(UUID, UUID, UUID) TO authenticated;

-- Verify the functions exist
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('remove_league_owner_for_player', 'set_league_owner_for_player')
AND routine_schema = 'public'; 