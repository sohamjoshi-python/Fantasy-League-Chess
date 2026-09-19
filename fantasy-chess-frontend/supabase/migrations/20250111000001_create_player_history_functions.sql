-- Function to get player's weekly performance history
CREATE OR REPLACE FUNCTION get_player_weekly_performance(p_player_id UUID)
RETURNS TABLE (
  week_start_date DATE,
  total_points NUMERIC,
  games_played INT,
  wins INT,
  draws INT,
  losses INT,
  average_acl NUMERIC,
  best_acl NUMERIC,
  worst_acl NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gr.week_start_date,
    COALESCE(SUM(CASE 
      WHEN gr.white_player_id = p_player_id THEN gr.white_points
      WHEN gr.black_player_id = p_player_id THEN gr.black_points
      ELSE 0
    END), 0)::NUMERIC as total_points,
    COUNT(*)::INT as games_played,
    SUM(CASE 
      WHEN (gr.white_player_id = p_player_id AND gr.result = '1-0') OR 
           (gr.black_player_id = p_player_id AND gr.result = '0-1') THEN 1
      ELSE 0
    END)::INT as wins,
    SUM(CASE 
      WHEN gr.result = '1/2-1/2' THEN 1
      ELSE 0
    END)::INT as draws,
    SUM(CASE 
      WHEN (gr.white_player_id = p_player_id AND gr.result = '0-1') OR 
           (gr.black_player_id = p_player_id AND gr.result = '1-0') THEN 1
      ELSE 0
    END)::INT as losses,
    AVG(CASE 
      WHEN gr.white_player_id = p_player_id THEN gr.white_acl
      WHEN gr.black_player_id = p_player_id THEN gr.black_acl
      ELSE NULL
    END)::NUMERIC as average_acl,
    MIN(CASE 
      WHEN gr.white_player_id = p_player_id THEN gr.white_acl
      WHEN gr.black_player_id = p_player_id THEN gr.black_acl
      ELSE NULL
    END)::NUMERIC as best_acl,
    MAX(CASE 
      WHEN gr.white_player_id = p_player_id THEN gr.white_acl
      WHEN gr.black_player_id = p_player_id THEN gr.black_acl
      ELSE NULL
    END)::NUMERIC as worst_acl
  FROM game_results gr
  WHERE gr.white_player_id = p_player_id OR gr.black_player_id = p_player_id
  GROUP BY gr.week_start_date
  ORDER BY gr.week_start_date DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_player_weekly_performance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_weekly_performance(UUID) TO anon;

