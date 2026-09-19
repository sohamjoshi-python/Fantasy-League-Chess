-- Drop old functions that used the leagues array
DROP FUNCTION IF EXISTS add_league_to_player(UUID, UUID);
DROP FUNCTION IF EXISTS remove_league_from_player(UUID, UUID); 