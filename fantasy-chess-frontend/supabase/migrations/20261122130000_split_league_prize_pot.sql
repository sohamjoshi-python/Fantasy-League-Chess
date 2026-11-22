-- League prize: each human manager gets half the buy-in back, and the other
-- half is split 50% / 30% / 20% across 1st, 2nd, and 3rd. Bots are not paid.
-- Leagues already marked payout_processed are left as they were paid.
-- 10 managers at 100: credits 300, 200, 150, then 50 for everyone else.

CREATE OR REPLACE FUNCTION public.league_place_payout(
  p_buy_in integer,
  p_finishers integer,
  p_place integer
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_buy integer := GREATEST(COALESCE(p_buy_in, 0), 0);
  v_count integer := GREATEST(COALESCE(p_finishers, 0), 0);
  v_refund integer;
  v_pool integer;
  v_first integer;
  v_second integer;
  v_third integer;
BEGIN
  IF v_buy = 0 OR v_count = 0 OR p_place IS NULL OR p_place < 1 OR p_place > v_count THEN
    RETURN 0;
  END IF;

  v_refund := v_buy / 2;
  v_pool := v_buy * v_count - v_refund * v_count;

  IF v_count = 1 THEN
    RETURN v_refund + v_pool;
  END IF;

  v_first := v_pool / 2;
  v_second := (v_pool * 30) / 100;
  v_third := v_pool - v_first - v_second;

  IF v_count = 2 THEN
    IF p_place = 1 THEN
      RETURN v_refund + v_first + v_third;
    END IF;
    IF p_place = 2 THEN
      RETURN v_refund + v_second;
    END IF;
    RETURN v_refund;
  END IF;

  IF p_place = 1 THEN
    RETURN v_refund + v_first;
  END IF;
  IF p_place = 2 THEN
    RETURN v_refund + v_second;
  END IF;
  IF p_place = 3 THEN
    RETURN v_refund + v_third;
  END IF;
  RETURN v_refund;
END;
$$;

REVOKE ALL ON FUNCTION public.league_place_payout(integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.league_place_payout(integer, integer, integer) TO service_role;

DO $$
BEGIN
  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.league_place_payout(integer, integer, integer) TO %I',
    (
      SELECT pg_get_userbyid(proowner)
      FROM pg_proc
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
      WHERE nspname = 'public'
        AND proname = 'league_place_payout'
    )
  );
END $$;

CREATE OR REPLACE FUNCTION app_private.process_league_payouts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  league_row RECORD;
  finisher RECORD;
  payout_already_exists BOOLEAN;
  finisher_count INTEGER;
BEGIN
  FOR league_row IN
    SELECT *
    FROM public.leagues
    WHERE end_date < CURRENT_DATE
      AND COALESCE(payout_processed, false) = false
    ORDER BY id
    FOR UPDATE
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.payouts
      WHERE payouts.league_id = league_row.id
    ) INTO payout_already_exists;

    IF payout_already_exists THEN
      UPDATE public.leagues
      SET
        payout_processed = true,
        updated_at = NOW()
      WHERE id = league_row.id;
      CONTINUE;
    END IF;

    SELECT COUNT(*)::integer
    INTO finisher_count
    FROM unnest(COALESCE(league_row.member_ids, ARRAY[]::uuid[])) AS member(member_id)
    JOIN public.users ON users.id = member.member_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.bots WHERE bots.id = member.member_id
    );

    IF finisher_count = 0 OR COALESCE(league_row.buy_in, 0) = 0 THEN
      UPDATE public.leagues
      SET
        payout_processed = true,
        updated_at = NOW()
      WHERE id = league_row.id;
      CONTINUE;
    END IF;

    FOR finisher IN
      SELECT
        humans.user_id,
        ROW_NUMBER() OVER (ORDER BY humans.points DESC, humans.user_id) AS place
      FROM (
        SELECT
          users.id AS user_id,
          COALESCE(SUM(lineups.total_points), 0) AS points
        FROM unnest(COALESCE(league_row.member_ids, ARRAY[]::uuid[])) AS member(member_id)
        JOIN public.users ON users.id = member.member_id
        LEFT JOIN public.lineups
          ON lineups.league_id = league_row.id
         AND lineups.user_id = users.id
        WHERE NOT EXISTS (
          SELECT 1 FROM public.bots WHERE bots.id = member.member_id
        )
        GROUP BY users.id
      ) AS humans
    LOOP
      INSERT INTO public.payouts (league_id, user_id, amount, rank)
      VALUES (
        league_row.id,
        finisher.user_id,
        public.league_place_payout(league_row.buy_in::integer, finisher_count, finisher.place::integer),
        finisher.place
      );

      UPDATE public.users
      SET
        coins = COALESCE(coins, 0) + public.league_place_payout(
          league_row.buy_in::integer,
          finisher_count,
          finisher.place::integer
        ),
        updated_at = NOW()
      WHERE id = finisher.user_id;
    END LOOP;

    UPDATE public.leagues
    SET
      payout_processed = true,
      updated_at = NOW()
    WHERE id = league_row.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_league_wins_leaderboard()
RETURNS TABLE(user_id uuid, username text, wins bigint, total_leagues bigint, total_prize_money numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      COALESCE(
        (
          SELECT p.amount
          FROM public.payouts p
          WHERE p.league_id = ult_league_id
            AND p.user_id = ult_user_id
          ORDER BY p.rank, p.amount DESC
          LIMIT 1
        ),
        public.league_place_payout(
          COALESCE(ult_buy_in, 0)::integer,
          (
            SELECT COUNT(*)::integer
            FROM unnest(COALESCE(ult_member_ids, ARRAY[]::uuid[])) AS member(member_id)
            JOIN public.users paying ON paying.id = member.member_id
            WHERE NOT EXISTS (
              SELECT 1 FROM public.bots b WHERE b.id = member.member_id
            )
          ),
          1
        )::numeric
      ) as lw_prize
    FROM user_league_totals
    ORDER BY ult_league_id, ult_total_points DESC, ult_user_id
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
$$;

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
  FROM league_winners lw
  JOIN users u ON lw.winner_user_id = u.id
  JOIN leagues l ON lw.winner_league_id = l.id
  ORDER BY l.end_date DESC
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.get_recent_winners_raw() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF public.league_place_payout(100, 10, 1) <> 300
     OR public.league_place_payout(100, 10, 2) <> 200
     OR public.league_place_payout(100, 10, 3) <> 150
     OR public.league_place_payout(100, 10, 4) <> 50
     OR public.league_place_payout(100, 2, 1) <> 120
     OR public.league_place_payout(100, 2, 2) <> 80
     OR public.league_place_payout(100, 1, 1) <> 100
     OR public.league_place_payout(15, 3, 1) <> 19
     OR public.league_place_payout(15, 3, 2) <> 14
     OR public.league_place_payout(15, 3, 3) <> 12
  THEN
    RAISE EXCEPTION 'league prize split did not match the agreed amounts';
  END IF;
END $$;
