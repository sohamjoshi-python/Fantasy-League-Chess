-- =====================================================
-- PASTE THIS IN YOUR SUPABASE SQL EDITOR AND RUN IT
-- =====================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS get_player_weekly_performance(UUID);

-- Create the weekly performance function
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
DECLARE
  player_name TEXT;
BEGIN
  -- Get the player's name from their ID
  SELECT name INTO player_name
  FROM chess_players
  WHERE id = p_player_id;

  -- If player not found, return empty result
  IF player_name IS NULL THEN
    RETURN;
  END IF;

  -- Query games table using player name
  RETURN QUERY
  SELECT 
    CAST(g.date AS DATE) as week_start_date,
    COALESCE(SUM(CASE 
      WHEN g.white = player_name THEN g.white_points
      WHEN g.black = player_name THEN g.black_points
      ELSE 0
    END), 0)::NUMERIC as total_points,
    COUNT(*)::INT as games_played,
    SUM(CASE 
      WHEN (g.white = player_name AND g.result = '1-0') OR 
           (g.black = player_name AND g.result = '0-1') THEN 1
      ELSE 0
    END)::INT as wins,
    SUM(CASE 
      WHEN g.result = '1/2-1/2' THEN 1
      ELSE 0
    END)::INT as draws,
    SUM(CASE 
      WHEN (g.white = player_name AND g.result = '0-1') OR 
           (g.black = player_name AND g.result = '1-0') THEN 1
      ELSE 0
    END)::INT as losses,
    AVG(CASE 
      WHEN g.white = player_name THEN g.white_accuracy
      WHEN g.black = player_name THEN g.black_accuracy
      ELSE NULL
    END)::NUMERIC as average_acl,
    MIN(CASE 
      WHEN g.white = player_name THEN g.white_accuracy
      WHEN g.black = player_name THEN g.black_accuracy
      ELSE NULL
    END)::NUMERIC as best_acl,
    MAX(CASE 
      WHEN g.white = player_name THEN g.white_accuracy
      WHEN g.black = player_name THEN g.black_accuracy
      ELSE NULL
    END)::NUMERIC as worst_acl
  FROM games g
  WHERE g.white = player_name OR g.black = player_name
  GROUP BY CAST(g.date AS DATE)
  ORDER BY CAST(g.date AS DATE) DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_player_weekly_performance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_weekly_performance(UUID) TO anon;

-- =====================================================
-- VERIFICATION: Run this to test the function works
-- =====================================================
-- Replace with an actual player ID from your database
-- SELECT * FROM get_player_weekly_performance('ee9d3e4c-37dd-4397-ada9-a47fcf62b174');

