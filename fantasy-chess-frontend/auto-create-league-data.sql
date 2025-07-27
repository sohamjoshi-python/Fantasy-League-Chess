-- Function to automatically create league data for new leagues
CREATE OR REPLACE FUNCTION create_league_data_for_user(
  user_id_input UUID,
  league_id_input UUID
)
RETURNS VOID AS $$
BEGIN
  -- Create team record if it doesn't exist
  INSERT INTO teams (user_id, league_id, player_ids)
  VALUES (user_id_input, league_id_input, ARRAY[]::TEXT[])
  ON CONFLICT (user_id, league_id) DO NOTHING;
  
  -- Create coin balance record if it doesn't exist
  INSERT INTO league_coin_balances (user_id, league_id, coin_balance)
  VALUES (user_id_input, league_id_input, 50)
  ON CONFLICT (user_id, league_id) DO NOTHING;
  
  -- Create lineup record for current week if it doesn't exist
  INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points)
  VALUES (user_id_input, league_id_input, '2025-07-21'::DATE, ARRAY[]::TEXT[], 0.00)
  ON CONFLICT (user_id, league_id, week_start_date) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_league_data_for_user(UUID, UUID) TO authenticated;

-- Create trigger to automatically create league data when a user joins a league
CREATE OR REPLACE FUNCTION trigger_create_league_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the function to create league data
  PERFORM create_league_data_for_user(NEW.user_id, NEW.league_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on league_members table
DROP TRIGGER IF EXISTS create_league_data_trigger ON league_members;
CREATE TRIGGER create_league_data_trigger
  AFTER INSERT ON league_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_league_data();

-- Manually create data for the current user and new league
SELECT create_league_data_for_user(
  '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 
  '52d3f84d-dd56-43c2-8f2a-b7f1705cd66a'::UUID
); 