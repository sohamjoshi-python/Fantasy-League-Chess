-- Add positive/negative point breakdowns to the global total-points leaderboard.

DROP FUNCTION IF EXISTS public.get_total_points_leaderboard();

CREATE FUNCTION public.get_total_points_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_points NUMERIC,
  points_won NUMERIC,
  points_lost NUMERIC,
  leagues_played BIGINT,
  average_points_per_league NUMERIC,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH lineup_totals AS (
    SELECT
      lineups.user_id,
      COALESCE(SUM(lineups.total_points), 0)::NUMERIC AS total_points,
      COUNT(DISTINCT lineups.league_id)::BIGINT AS leagues_played
    FROM public.lineups
    WHERE lineups.user_id IS NOT NULL
      AND COALESCE(lineups.total_points, 0) <> 0
    GROUP BY lineups.user_id
  ),
  player_game_points AS (
    SELECT
      lineups.user_id,
      CASE
        WHEN games.white = chess_players.name THEN COALESCE(games.white_points, 0)
        WHEN games.black = chess_players.name THEN COALESCE(games.black_points, 0)
        ELSE 0
      END::NUMERIC AS player_points
    FROM public.lineups
    JOIN public.chess_players
      ON chess_players.id = ANY(lineups.player_ids)
    JOIN public.games
      ON games.date = REPLACE((lineups.week_start_date + INTERVAL '1 day')::DATE::TEXT, '-', '.')
      AND (games.white = chess_players.name OR games.black = chess_players.name)
    WHERE lineups.user_id IS NOT NULL
  ),
  point_breakdown AS (
    SELECT
      player_game_points.user_id,
      COALESCE(SUM(GREATEST(player_game_points.player_points, 0)), 0)::NUMERIC AS points_won,
      COALESCE(ABS(SUM(LEAST(player_game_points.player_points, 0))), 0)::NUMERIC AS points_lost
    FROM player_game_points
    GROUP BY player_game_points.user_id
  )
  SELECT
    users.id AS user_id,
    users.username,
    lineup_totals.total_points,
    COALESCE(point_breakdown.points_won, GREATEST(lineup_totals.total_points, 0)) AS points_won,
    COALESCE(point_breakdown.points_lost, ABS(LEAST(lineup_totals.total_points, 0))) AS points_lost,
    lineup_totals.leagues_played,
    CASE
      WHEN lineup_totals.leagues_played > 0
        THEN lineup_totals.total_points / lineup_totals.leagues_played
      ELSE 0
    END AS average_points_per_league,
    users.avatar_url AS avatar_url
  FROM lineup_totals
  JOIN public.users ON users.id = lineup_totals.user_id
  LEFT JOIN point_breakdown ON point_breakdown.user_id = lineup_totals.user_id
  WHERE lineup_totals.total_points <> 0
  ORDER BY lineup_totals.total_points DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_total_points_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_points_leaderboard() TO anon;
