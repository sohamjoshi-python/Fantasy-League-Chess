-- Recent winners lists each player once. Extra league wins in the last 30 days
-- stay in the wins leaderboard, but this list keeps only their latest win.

CREATE OR REPLACE FUNCTION public.get_recent_winners_raw()
RETURNS TABLE(user_id uuid, username text, league_name text, prize_amount numeric, won_date date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    ORDER BY rw_league_id, rw_total_points DESC, rw_user_id
  ),
  one_win_each AS (
    SELECT DISTINCT ON (lw.winner_user_id)
      lw.winner_league_id,
      lw.winner_user_id
    FROM league_winners lw
    JOIN leagues l ON l.id = lw.winner_league_id
    ORDER BY lw.winner_user_id, l.end_date DESC, lw.winner_league_id
  )
  SELECT
    u.id,
    u.username,
    l.name,
    COALESCE(
      (
        SELECT p.amount
        FROM public.payouts p
        WHERE p.league_id = l.id
          AND p.user_id = u.id
        ORDER BY p.rank, p.amount DESC
        LIMIT 1
      ),
      public.league_place_payout(
        COALESCE(l.buy_in, 0)::integer,
        (
          SELECT COUNT(*)::integer
          FROM unnest(COALESCE(l.member_ids, ARRAY[]::uuid[])) AS member(member_id)
          JOIN public.users paying ON paying.id = member.member_id
          WHERE NOT EXISTS (
            SELECT 1 FROM public.bots b WHERE b.id = member.member_id
          )
        ),
        1
      )::numeric
    ),
    l.end_date
  FROM one_win_each lw
  JOIN users u ON lw.winner_user_id = u.id
  JOIN leagues l ON lw.winner_league_id = l.id
  ORDER BY l.end_date DESC, u.id
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.get_recent_winners_raw() FROM PUBLIC, anon, authenticated;
