-- Test query: Calculate total points for the first user's lineup on June 24, 2025

WITH first_lineup AS (
  SELECT player_ids, user_id
  FROM public.lineups
  WHERE week_start_date = '2025.06.24'
  ORDER BY created_at
  LIMIT 1
),
lineup_players AS (
  SELECT unnest(player_ids) AS player_id, user_id
  FROM first_lineup
),
player_names AS (
  SELECT lp.player_id, cp.name, lp.user_id
  FROM lineup_players lp
  JOIN public.chess_players cp ON cp.id = lp.player_id
),
player_points AS (
  SELECT
    pn.player_id,
    pn.name,
    COALESCE(SUM(
      CASE
        WHEN g.white = pn.name THEN g.white_points
        WHEN g.black = pn.name THEN g.black_points
        ELSE 0
      END
    ), 0) AS player_total_points
  FROM player_names pn
  LEFT JOIN public.games g ON g.date = '2025.06.24' AND (g.white = pn.name OR g.black = pn.name)
  GROUP BY pn.player_id, pn.name
)
SELECT
  pp.player_id,
  pp.name,
  pp.player_total_points
FROM player_points pp

UNION ALL

SELECT
  NULL AS player_id,
  'TOTAL' AS name,
  SUM(pp.player_total_points) AS player_total_points
FROM player_points pp; 