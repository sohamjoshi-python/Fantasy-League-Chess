-- Add league to player's leagues array
CREATE OR REPLACE FUNCTION add_league_to_player(p_player_id UUID, p_league_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chess_players
  SET leagues = array_append(leagues, p_league_id)
  WHERE id = p_player_id AND NOT (leagues @> ARRAY[p_league_id]);
END;
$$ LANGUAGE plpgsql;

-- Remove league from player's leagues array
CREATE OR REPLACE FUNCTION remove_league_from_player(p_player_id UUID, p_league_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chess_players
  SET leagues = array_remove(leagues, p_league_id)
  WHERE id = p_player_id AND leagues @> ARRAY[p_league_id];
END;
$$ LANGUAGE plpgsql;

-- Add coins to user's league balance
CREATE OR REPLACE FUNCTION add_league_coins(p_user_id UUID, p_league_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.league_coin_balances
  SET coin_balance = coin_balance + p_amount
  WHERE user_id = p_user_id AND league_id = p_league_id;
END;
$$ LANGUAGE plpgsql;

-- Deduct coins from user's league balance
CREATE OR REPLACE FUNCTION deduct_league_coins(p_user_id UUID, p_league_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.league_coin_balances
  SET coin_balance = coin_balance - p_amount
  WHERE user_id = p_user_id AND league_id = p_league_id;
END;
$$ LANGUAGE plpgsql; 