-- Atomic league join, member-only league reads, and join/discovery RPCs.
-- Run in Supabase SQL editor or via migration deploy.

-- ---------------------------------------------------------------------------
-- League SELECT: members and creators only (no league-wide leak by URL)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "leagues_select_policy" ON public.leagues;

CREATE POLICY "leagues_select_policy" ON public.leagues
  FOR SELECT
  USING (
    auth.uid() = creator_id
    OR auth.uid() = ANY(COALESCE(member_ids, ARRAY[]::uuid[]))
  );

-- ---------------------------------------------------------------------------
-- Join / discovery RPCs (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_league_by_join_code(p_join_code text)
RETURNS SETOF public.leagues
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.leagues
  WHERE UPPER(join_code) = UPPER(TRIM(p_join_code))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_joinable_public_leagues()
RETURNS SETOF public.leagues
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.leagues
  WHERE is_public = true
    AND start_date > CURRENT_DATE
    AND COALESCE(marketplace_started, false) = false
    AND COALESCE(marketplace_completed, false) = false
    AND COALESCE(draft_completed, false) = false
    AND COALESCE(draft_started, false) = false
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.join_league_atomic(p_league_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_league public.leagues%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_max_members integer;
  v_member_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_league FROM public.leagues WHERE id = p_league_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'League not found');
  END IF;

  IF COALESCE(v_league.draft_started, false)
     OR COALESCE(v_league.draft_completed, false)
     OR COALESCE(v_league.marketplace_started, false)
     OR COALESCE(v_league.marketplace_completed, false)
     OR v_league.start_date <= CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot join a league that is in progress or has already started.'
    );
  END IF;

  IF v_user_id = ANY(COALESCE(v_league.member_ids, ARRAY[]::uuid[])) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already a member of this league');
  END IF;

  v_max_members := COALESCE(v_league.max_members, 10);
  v_member_count := COALESCE(array_length(v_league.member_ids, 1), 0);
  IF v_member_count >= v_max_members THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('League is full (%s/%s members)', v_member_count, v_max_members)
    );
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  IF v_user.coins < v_league.buy_in THEN
    RETURN jsonb_build_object('success', false, 'error', 'You don''t have enough coins for this league');
  END IF;

  UPDATE public.leagues
  SET
    member_ids = array_append(COALESCE(member_ids, ARRAY[]::uuid[]), v_user_id),
    draft_order = array_append(COALESCE(draft_order, ARRAY[]::uuid[]), v_user_id)
  WHERE id = p_league_id;

  UPDATE public.users
  SET coins = coins - v_league.buy_in
  WHERE id = v_user_id;

  PERFORM public.create_league_data_for_user(v_user_id, p_league_id);

  RETURN jsonb_build_object('success', true, 'league_id', p_league_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_league_by_join_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_joinable_public_leagues() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_league_atomic(uuid) TO authenticated;

-- Use current Monday for new league lineups (not a fixed date)
CREATE OR REPLACE FUNCTION public.create_league_data_for_user(
  user_id_input UUID,
  league_id_input UUID
)
RETURNS VOID AS $$
DECLARE
  week_start date;
BEGIN
  week_start := CURRENT_DATE - (((EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7)::int);

  INSERT INTO teams (user_id, league_id, player_ids)
  VALUES (user_id_input, league_id_input, ARRAY[]::TEXT[])
  ON CONFLICT (user_id, league_id) DO NOTHING;

  INSERT INTO league_coin_balances (user_id, league_id, coin_balance)
  VALUES (user_id_input, league_id_input, 50)
  ON CONFLICT (user_id, league_id) DO NOTHING;

  INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points)
  VALUES (user_id_input, league_id_input, week_start, ARRAY[]::TEXT[], 0.00)
  ON CONFLICT (user_id, league_id, week_start_date) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
