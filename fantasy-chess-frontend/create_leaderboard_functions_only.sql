-- ==========================================
-- CREATE LEADERBOARD FUNCTIONS
-- This script only creates the leaderboard RPC functions
-- No sample data - that will appear naturally as users play
-- ==========================================

-- Drop existing functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS get_league_wins_leaderboard();
DROP FUNCTION IF EXISTS get_total_points_leaderboard();
DROP FUNCTION IF EXISTS get_recent_winners();
DROP FUNCTION IF EXISTS get_weekly_top_performers(DATE);

-- Function 1: Get League Wins Leaderboard
CREATE FUNCTION get_league_wins_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  wins BIGINT,
  total_leagues BIGINT,
  total_prize_money NUMERIC,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    COUNT(DISTINCT CASE WHEN l.winner_id = u.id THEN l.id END) as wins,
    COUNT(DISTINCT l.id) as total_leagues,
    COALESCE(SUM(CASE WHEN l.winner_id = u.id THEN l.entry_fee * COALESCE(array_length(l.member_ids, 1), 0) END), 0) as total_prize_money,
    u.avatar_url
  FROM users u
  LEFT JOIN leagues l ON u.id = ANY(l.member_ids)
  WHERE l.end_date < CURRENT_DATE
  GROUP BY u.id, u.username, u.avatar_url
  HAVING COUNT(DISTINCT CASE WHEN l.winner_id = u.id THEN l.id END) > 0
  ORDER BY wins DESC, total_prize_money DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get Total Points Leaderboard
CREATE FUNCTION get_total_points_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_points NUMERIC,
  leagues_played BIGINT,
  average_points_per_league NUMERIC,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    COALESCE(SUM(ln.total_points), 0) as total_points,
    COUNT(DISTINCT ln.league_id) as leagues_played,
    CASE 
      WHEN COUNT(DISTINCT ln.league_id) > 0 
      THEN COALESCE(SUM(ln.total_points), 0) / COUNT(DISTINCT ln.league_id)
      ELSE 0 
    END as average_points_per_league,
    u.avatar_url
  FROM users u
  LEFT JOIN lineups ln ON u.id = ln.user_id
  WHERE ln.total_points > 0
  GROUP BY u.id, u.username, u.avatar_url
  HAVING COALESCE(SUM(ln.total_points), 0) > 0
  ORDER BY total_points DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get Recent Winners (Last 30 Days)
CREATE FUNCTION get_recent_winners()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  league_name TEXT,
  prize_amount NUMERIC,
  won_date DATE,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    l.name as league_name,
    (l.entry_fee * COALESCE(array_length(l.member_ids, 1), 0))::NUMERIC as prize_amount,
    l.end_date as won_date,
    u.avatar_url
  FROM leagues l
  JOIN users u ON l.winner_id = u.id
  WHERE l.end_date >= CURRENT_DATE - INTERVAL '30 days'
    AND l.end_date < CURRENT_DATE
    AND l.winner_id IS NOT NULL
  ORDER BY l.end_date DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Get Weekly Top Performers
CREATE FUNCTION get_weekly_top_performers(week_date DATE)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  league_name TEXT,
  week_points NUMERIC,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    l.name as league_name,
    ln.total_points as week_points,
    u.avatar_url
  FROM lineups ln
  JOIN users u ON ln.user_id = u.id
  JOIN leagues l ON ln.league_id = l.id
  WHERE ln.week_start_date = week_date
    AND ln.total_points > 0
  ORDER BY ln.total_points DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION get_league_wins_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_league_wins_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION get_total_points_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_points_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION get_recent_winners() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_winners() TO anon;
GRANT EXECUTE ON FUNCTION get_weekly_top_performers(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_top_performers(DATE) TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Leaderboard functions created successfully!';
  RAISE NOTICE 'The leaderboard will populate automatically as users:';
  RAISE NOTICE '  - Complete leagues (for wins leaderboard)';
  RAISE NOTICE '  - Earn points in lineups (for points leaderboard)';
  RAISE NOTICE '  - Win leagues (for recent winners)';
  RAISE NOTICE 'No sample data needed - real competition starts now! 🏆';
END $$;

