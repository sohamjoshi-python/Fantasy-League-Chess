-- Unexpected database failures were returned to clients via SQLERRM, which
-- includes function names, constraints, and other internal context.
-- Log that detail on the server and send a generic message instead.

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
  app_today date;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  app_today := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;

  SELECT * INTO v_league FROM public.leagues WHERE id = p_league_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'League not found');
  END IF;

  IF COALESCE(v_league.draft_started, false)
     OR COALESCE(v_league.draft_completed, false)
     OR COALESCE(v_league.marketplace_started, false)
     OR COALESCE(v_league.marketplace_completed, false)
     OR v_league.start_date <= app_today THEN
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
  WHERE id = p_league_id
    AND NOT v_user_id = ANY(COALESCE(member_ids, ARRAY[]::uuid[]));

  UPDATE public.users
  SET coins = coins - v_league.buy_in
  WHERE id = v_user_id;

  PERFORM public.create_league_data_for_user(v_user_id, p_league_id);

  RETURN jsonb_build_object('success', true, 'league_id', p_league_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'join_league_atomic failed: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', 'Could not join this league. Please try again.');
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_start_due_marketplaces()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    app_today date;
    league_record RECORD;
    started_ids uuid[] := ARRAY[]::uuid[];
    skipped jsonb := '[]'::jsonb;
    member_count integer;
BEGIN
    app_today := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;

    FOR league_record IN
        SELECT id, name, start_date, member_ids
        FROM public.leagues
        WHERE COALESCE(marketplace_started, false) = false
          AND COALESCE(marketplace_completed, false) = false
          AND COALESCE(draft_completed, false) = false
          AND start_date IS NOT NULL
          AND start_date <= app_today + 7
          AND (end_date IS NULL OR end_date >= app_today)
        FOR UPDATE SKIP LOCKED
    LOOP
        member_count := COALESCE(array_length(league_record.member_ids, 1), 0);
        IF member_count < 2 THEN
            skipped := skipped || jsonb_build_object(
                'id', league_record.id,
                'name', league_record.name,
                'start_date', league_record.start_date,
                'member_count', member_count,
                'reason', 'Need at least 2 members'
            );
            CONTINUE;
        END IF;

        BEGIN
            PERFORM public.start_marketplace(league_record.id);
            started_ids := started_ids || league_record.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'auto_start_due_marketplaces failed for league %: %', league_record.id, SQLERRM;
            skipped := skipped || jsonb_build_object(
                'id', league_record.id,
                'name', league_record.name,
                'start_date', league_record.start_date,
                'reason', 'Could not start marketplace'
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'as_of', app_today,
        'started_count', COALESCE(array_length(started_ids, 1), 0),
        'started_ids', to_jsonb(started_ids),
        'skipped', skipped
    );
END;
$$;
