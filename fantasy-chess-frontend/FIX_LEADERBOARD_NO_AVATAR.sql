-- ==========================================
-- FIX LEADERBOARD FUNCTIONS (No Avatar URL)
-- ==========================================

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
  total_prize_money NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_league_totals AS (
    SELECT 
      ln.league_id as ult_league_id,
      ln.user_id as ult_user_id,
      l.buy_in as ult_buy_in,
      l.member_ids as ult_member_ids,
      SUM(ln.total_points) as ult_total_points
    FROM lineups ln
    JOIN leagues l ON ln.league_id = l.id
    WHERE l.end_date < CURRENT_DATE
    GROUP BY ln.league_id, ln.user_id, l.buy_in, l.member_ids
  ),
  league_winners AS (
    SELECT DISTINCT ON (ult_league_id)
      ult_league_id as lw_league_id,
      ult_user_id as lw_winner_id,
      (ult_buy_in * COALESCE(array_length(ult_member_ids, 1), 0))::NUMERIC as lw_prize
    FROM user_league_totals
    ORDER BY ult_league_id, ult_total_points DESC
  )
  SELECT 
    u.id,
    u.username,
    COUNT(DISTINCT lw.lw_league_id)::BIGINT,
    COUNT(DISTINCT CASE WHEN u.id = ANY(l.member_ids) THEN l.id END)::BIGINT,
    COALESCE(SUM(lw.lw_prize), 0)::NUMERIC
  FROM users u
  INNER JOIN league_winners lw ON u.id = lw.lw_winner_id
  LEFT JOIN leagues l ON u.id = ANY(l.member_ids) AND l.end_date < CURRENT_DATE
  GROUP BY u.id, u.username
  HAVING COUNT(DISTINCT lw.lw_league_id) > 0
  ORDER BY COUNT(DISTINCT lw.lw_league_id) DESC, COALESCE(SUM(lw.lw_prize), 0) DESC
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
  average_points_per_league NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    COALESCE(SUM(ln.total_points), 0),
    COUNT(DISTINCT ln.league_id)::BIGINT,
    CASE 
      WHEN COUNT(DISTINCT ln.league_id) > 0 
      THEN COALESCE(SUM(ln.total_points), 0) / COUNT(DISTINCT ln.league_id)
      ELSE 0 
    END
  FROM users u
  LEFT JOIN lineups ln ON u.id = ln.user_id
  WHERE ln.total_points > 0
  GROUP BY u.id, u.username
  HAVING COALESCE(SUM(ln.total_points), 0) > 0
  ORDER BY COALESCE(SUM(ln.total_points), 0) DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get Recent Winners
CREATE FUNCTION get_recent_winners()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  league_name TEXT,
  prize_amount NUMERIC,
  won_date DATE
) AS $$
BEGIN
  RETURN QUERY
  WITH user_league_totals AS (
    SELECT 
      ln.league_id as rw_league_id,
      ln.user_id as rw_user_id,
      SUM(ln.total_points) as rw_total_points
    FROM lineups ln
    JOIN leagues l ON ln.league_id = l.id
    WHERE l.end_date >= CURRENT_DATE - INTERVAL '30 days'
      AND l.end_date < CURRENT_DATE
    GROUP BY ln.league_id, ln.user_id
  ),
  league_winners AS (
    SELECT DISTINCT ON (rw_league_id)
      rw_league_id as winner_league_id,
      rw_user_id as winner_user_id
    FROM user_league_totals
    ORDER BY rw_league_id, rw_total_points DESC
  )
  SELECT 
    u.id,
    u.username,
    l.name,
    (l.buy_in * COALESCE(array_length(l.member_ids, 1), 0))::NUMERIC,
    l.end_date
  FROM league_winners lw
  JOIN users u ON lw.winner_user_id = u.id
  JOIN leagues l ON lw.winner_league_id = l.id
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
  week_points NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    l.name,
    ln.total_points
  FROM lineups ln
  JOIN users u ON ln.user_id = u.id
  JOIN leagues l ON ln.league_id = l.id
  WHERE ln.week_start_date = week_date
    AND ln.total_points > 0
  ORDER BY ln.total_points DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_league_wins_leaderboard() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_total_points_leaderboard() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_recent_winners() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_weekly_top_performers(DATE) TO authenticated, anon;

-- Test and display results
SELECT '=== FUNCTIONS RECREATED ===' as status;

SELECT 'League Wins Leaderboard' as test, COUNT(*) as entries FROM get_league_wins_leaderboard();
SELECT * FROM get_league_wins_leaderboard();

SELECT 'Total Points Leaderboard' as test, COUNT(*) as entries FROM get_total_points_leaderboard();
SELECT * FROM get_total_points_leaderboard() LIMIT 10;

SELECT 'Recent Winners' as test, COUNT(*) as entries FROM get_recent_winners();
SELECT * FROM get_recent_winners();

SELECT '=== ALL DONE! ===' as status;

