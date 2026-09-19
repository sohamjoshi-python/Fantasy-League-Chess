-- Set league owner for a player
CREATE OR REPLACE FUNCTION set_league_owner_for_player(p_player_id UUID, p_league_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chess_players
  SET league_owners = COALESCE(league_owners, '{}'::jsonb) || jsonb_build_object(p_league_id::text, p_user_id::text)
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- Remove league owner for a player
CREATE OR REPLACE FUNCTION remove_league_owner_for_player(p_player_id UUID, p_league_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chess_players
  SET league_owners = league_owners - p_league_id::text
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql; 