-- Buying, selling and draft picks run on the server so prices, coin balances, rosters and
-- draft turns cannot be edited from the browser. Additive only: nothing is dropped.

CREATE OR REPLACE FUNCTION public.player_price_for_elo(p_elo integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN COALESCE(p_elo, 0) >= 3200 THEN 50
    WHEN COALESCE(p_elo, 0) >= 3100 THEN 40
    WHEN COALESCE(p_elo, 0) >= 3000 THEN 30
    WHEN COALESCE(p_elo, 0) >= 2900 THEN 20
    WHEN COALESCE(p_elo, 0) >= 2700 THEN 15
    WHEN COALESCE(p_elo, 0) >= 2400 THEN 10
    ELSE 5
  END
$$;

CREATE OR REPLACE FUNCTION public.buy_league_player(p_league_id uuid, p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_league public.leagues%ROWTYPE;
  v_player public.chess_players%ROWTYPE;
  v_team public.teams%ROWTYPE;
  v_price integer;
  v_balance integer;
  v_max integer;
  v_order uuid[];
  v_len integer;
  v_turn integer;
  v_draft_active boolean;
  v_new_order uuid[];
  v_new_turn integer;
  v_completed boolean;
  v_removed boolean := false;
  i integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Please sign in again' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_league FROM public.leagues WHERE id = p_league_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'League not found';
  END IF;
  IF NOT (v_caller = ANY (COALESCE(v_league.member_ids, ARRAY[]::uuid[]))) THEN
    RAISE EXCEPTION 'You are not a member of this league' USING ERRCODE = '42501';
  END IF;
  IF v_league.end_date IS NOT NULL
     AND v_league.end_date < (now() AT TIME ZONE 'America/Los_Angeles')::date THEN
    RAISE EXCEPTION 'This league has ended. Player buying, selling, and trading are closed.';
  END IF;
  IF NOT COALESCE(v_league.marketplace_started, false) THEN
    RAISE EXCEPTION 'The draft has not started yet';
  END IF;

  v_order := COALESCE(v_league.marketplace_order, ARRAY[]::uuid[]);
  v_len := COALESCE(array_length(v_order, 1), 0);
  v_turn := GREATEST(COALESCE(v_league.current_marketplace_turn, 0), 0);
  v_draft_active := NOT COALESCE(v_league.marketplace_completed, false)
    AND NOT COALESCE(v_league.draft_completed, false)
    AND v_len > 0
    AND v_turn < v_len;

  IF v_draft_active AND v_order[v_turn + 1] IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'It is not your turn';
  END IF;

  SELECT * INTO v_player FROM public.chess_players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;
  v_price := public.player_price_for_elo(v_player.elo);

  INSERT INTO public.teams (user_id, league_id, player_ids)
  VALUES (v_caller, p_league_id, ARRAY[]::uuid[])
  ON CONFLICT (user_id, league_id) DO NOTHING;

  SELECT * INTO v_team
  FROM public.teams
  WHERE user_id = v_caller AND league_id = p_league_id
  FOR UPDATE;

  IF p_player_id = ANY (COALESCE(v_team.player_ids, ARRAY[]::uuid[])) THEN
    RAISE EXCEPTION 'You already own this player';
  END IF;
  v_max := COALESCE(v_league.max_players_per_team, 10);
  IF COALESCE(array_length(v_team.player_ids, 1), 0) >= v_max THEN
    RAISE EXCEPTION 'Your team is full (max % players)', v_max;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.league_player_ownership
    WHERE league_id = p_league_id AND player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'This player was just taken by another manager.';
  END IF;

  SELECT coin_balance INTO v_balance
  FROM public.league_coin_balances
  WHERE user_id = v_caller AND league_id = p_league_id
  FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Your coin balance for this league was not found';
  END IF;
  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Not enough coins for this player';
  END IF;

  UPDATE public.teams
  SET player_ids = COALESCE(player_ids, ARRAY[]::uuid[]) || p_player_id,
      updated_at = now()
  WHERE id = v_team.id;

  UPDATE public.league_coin_balances
  SET coin_balance = coin_balance - v_price,
      updated_at = now()
  WHERE user_id = v_caller AND league_id = p_league_id
  RETURNING coin_balance INTO v_balance;

  INSERT INTO public.coin_transactions (user_id, league_id, transaction_type, amount, balance_after, description)
  VALUES (v_caller, p_league_id, 'player_purchase', -v_price, v_balance, 'Purchased ' || v_player.name);

  v_new_order := v_order;
  v_new_turn := v_turn;
  v_completed := COALESCE(v_league.marketplace_completed, false);

  IF v_draft_active THEN
    IF v_balance <= 0 THEN
      -- Out of coins: leave the remaining turns, keeping everyone else's order.
      v_new_order := ARRAY[]::uuid[];
      v_new_turn := 0;
      FOR i IN 1..v_len LOOP
        IF v_order[i] IS NOT DISTINCT FROM v_caller THEN
          CONTINUE;
        END IF;
        v_new_order := v_new_order || v_order[i];
        IF i <= v_turn THEN
          v_new_turn := v_new_turn + 1;
        END IF;
      END LOOP;
      v_removed := true;
    ELSE
      v_new_turn := v_turn + 1;
    END IF;
    v_completed := v_new_turn >= COALESCE(array_length(v_new_order, 1), 0);

    UPDATE public.leagues
    SET marketplace_order = v_new_order,
        current_marketplace_turn = v_new_turn,
        marketplace_turn_started_at = now(),
        marketplace_turn_email_sent_for = NULL,
        marketplace_completed = CASE WHEN v_completed THEN true ELSE marketplace_completed END,
        draft_completed = CASE WHEN v_completed THEN true ELSE draft_completed END
    WHERE id = p_league_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'price', v_price,
    'coin_balance', v_balance,
    'draft_active', v_draft_active,
    'removed_from_draft', v_removed,
    'marketplace_order', to_jsonb(v_new_order),
    'current_marketplace_turn', v_new_turn,
    'marketplace_completed', v_completed
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sell_league_player(p_league_id uuid, p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_league public.leagues%ROWTYPE;
  v_player public.chess_players%ROWTYPE;
  v_team public.teams%ROWTYPE;
  v_refund integer;
  v_balance integer;
  v_len integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Please sign in again' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_league FROM public.leagues WHERE id = p_league_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'League not found';
  END IF;
  IF NOT (v_caller = ANY (COALESCE(v_league.member_ids, ARRAY[]::uuid[]))) THEN
    RAISE EXCEPTION 'You are not a member of this league' USING ERRCODE = '42501';
  END IF;
  IF v_league.end_date IS NOT NULL
     AND v_league.end_date < (now() AT TIME ZONE 'America/Los_Angeles')::date THEN
    RAISE EXCEPTION 'This league has ended. Player buying, selling, and trading are closed.';
  END IF;
  v_len := COALESCE(array_length(v_league.marketplace_order, 1), 0);
  IF NOT COALESCE(v_league.marketplace_started, false)
     OR (
       NOT COALESCE(v_league.marketplace_completed, false)
       AND NOT COALESCE(v_league.draft_completed, false)
       AND v_len > 0
       AND COALESCE(v_league.current_marketplace_turn, 0) < v_len
     ) THEN
    RAISE EXCEPTION 'Players can be sold once the draft is finished';
  END IF;

  SELECT * INTO v_team
  FROM public.teams
  WHERE user_id = v_caller AND league_id = p_league_id
  FOR UPDATE;
  IF NOT FOUND OR NOT (p_player_id = ANY (COALESCE(v_team.player_ids, ARRAY[]::uuid[]))) THEN
    RAISE EXCEPTION 'Player is not owned by you';
  END IF;

  SELECT * INTO v_player FROM public.chess_players WHERE id = p_player_id;
  v_refund := (public.player_price_for_elo(v_player.elo) * 4) / 5;

  UPDATE public.teams
  SET player_ids = array_remove(COALESCE(player_ids, ARRAY[]::uuid[]), p_player_id),
      updated_at = now()
  WHERE id = v_team.id;

  INSERT INTO public.league_coin_balances (user_id, league_id, coin_balance)
  VALUES (v_caller, p_league_id, v_refund)
  ON CONFLICT (user_id, league_id)
  DO UPDATE SET coin_balance = public.league_coin_balances.coin_balance + EXCLUDED.coin_balance,
                updated_at = now()
  RETURNING coin_balance INTO v_balance;

  INSERT INTO public.coin_transactions (user_id, league_id, transaction_type, amount, balance_after, description)
  VALUES (v_caller, p_league_id, 'player_sale', v_refund, v_balance,
          'Sold ' || COALESCE(v_player.name, 'player') || ' to marketplace');

  UPDATE public.trades
  SET status = 'cancelled',
      cancelled_at = now()
  WHERE league_id = p_league_id
    AND seller_id = v_caller
    AND player_id = p_player_id
    AND status = 'pending';

  RETURN jsonb_build_object('success', true, 'refund', v_refund, 'coin_balance', v_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.buy_league_player(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sell_league_player(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_league_player(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sell_league_player(uuid, uuid) TO authenticated, service_role;

-- Draft state on the league row. The creator keeps full control; other members may only make
-- the moves the draft screen makes (advance a bot's or their own turn, drop broke/withdrawn
-- participants, close a draft that has run out of picks).
CREATE OR REPLACE FUNCTION public.guard_league_draft_edits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  caller uuid := auth.uid();
  old_order uuid[] := COALESCE(OLD.marketplace_order, ARRAY[]::uuid[]);
  new_order uuid[] := COALESCE(NEW.marketplace_order, ARRAY[]::uuid[]);
  old_turn integer := GREATEST(COALESCE(OLD.current_marketplace_turn, 0), 0);
  new_turn integer := GREATEST(COALESCE(NEW.current_marketplace_turn, 0), 0);
  old_picker uuid;
  old_seq uuid[];
  new_seq uuid[];
BEGIN
  IF current_user <> 'authenticated' OR caller IS NOT DISTINCT FROM OLD.creator_id THEN
    RETURN NEW;
  END IF;

  IF NEW.payout_processed IS DISTINCT FROM OLD.payout_processed
     OR NEW.max_players_per_team IS DISTINCT FROM OLD.max_players_per_team
     OR NEW.marketplace_withdrawn_ids IS DISTINCT FROM OLD.marketplace_withdrawn_ids
     OR NEW.marketplace_scheduled_at IS DISTINCT FROM OLD.marketplace_scheduled_at
     OR COALESCE(NEW.marketplace_started, false) IS DISTINCT FROM COALESCE(OLD.marketplace_started, false)
     OR (COALESCE(OLD.marketplace_completed, false) AND NOT COALESCE(NEW.marketplace_completed, false))
     OR (COALESCE(OLD.draft_completed, false) AND NOT COALESCE(NEW.draft_completed, false)) THEN
    RAISE EXCEPTION 'Only the league creator can change the draft settings' USING ERRCODE = '42501';
  END IF;

  IF NOT COALESCE(OLD.marketplace_started, false) THEN
    IF new_order IS DISTINCT FROM old_order OR new_turn IS DISTINCT FROM old_turn THEN
      RAISE EXCEPTION 'The draft has not started yet' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF COALESCE(OLD.marketplace_completed, false) OR COALESCE(OLD.draft_completed, false) THEN
    IF new_order IS DISTINCT FROM old_order OR new_turn IS DISTINCT FROM old_turn THEN
      RAISE EXCEPTION 'The draft is already finished' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  old_picker := old_order[old_turn + 1];

  IF new_order IS NOT DISTINCT FROM old_order THEN
    IF new_turn <> old_turn THEN
      IF new_turn <> old_turn + 1
         OR NOT (
           old_picker IS NOT DISTINCT FROM caller
           OR EXISTS (SELECT 1 FROM public.bots b WHERE b.id = old_picker)
         ) THEN
        RAISE EXCEPTION 'Only the current picker can end their turn' USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSIF cardinality(old_order) = 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(new_order) AS n(id)
      WHERE NOT (n.id = ANY (COALESCE(OLD.member_ids, ARRAY[]::uuid[])))
    ) OR new_turn <> 0 THEN
      RAISE EXCEPTION 'The draft order can only include league members' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Nobody may be added, reordered, or removed unless they are this member, a bot,
    -- out of coins, withdrawn, or no longer in the league.
    IF EXISTS (
      SELECT 1 FROM unnest(new_order) AS n(id)
      WHERE NOT (n.id = ANY (old_order))
    ) THEN
      RAISE EXCEPTION 'Participants cannot be added to a running draft' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM (SELECT DISTINCT o.id FROM unnest(old_order) AS o(id)) AS gone
      WHERE NOT (gone.id = ANY (new_order))
        AND gone.id IS DISTINCT FROM caller
        AND NOT EXISTS (SELECT 1 FROM public.bots b WHERE b.id = gone.id)
        AND gone.id = ANY (COALESCE(OLD.member_ids, ARRAY[]::uuid[]))
        AND NOT (gone.id = ANY (COALESCE(OLD.marketplace_withdrawn_ids, ARRAY[]::uuid[])))
        AND COALESCE((
          SELECT lcb.coin_balance FROM public.league_coin_balances lcb
          WHERE lcb.league_id = OLD.id AND lcb.user_id = gone.id
          LIMIT 1
        ), 0) > 0
    ) THEN
      RAISE EXCEPTION 'Only broke or withdrawn participants can be removed from the draft' USING ERRCODE = '42501';
    END IF;

    SELECT array_agg(s.id ORDER BY s.first_pos) INTO old_seq
    FROM (
      SELECT o.id, min(o.pos) AS first_pos
      FROM unnest(old_order) WITH ORDINALITY AS o(id, pos)
      WHERE o.id = ANY (new_order)
      GROUP BY o.id
    ) s;
    SELECT array_agg(s.id ORDER BY s.first_pos) INTO new_seq
    FROM (
      SELECT n.id, min(n.pos) AS first_pos
      FROM unnest(new_order) WITH ORDINALITY AS n(id, pos)
      GROUP BY n.id
    ) s;
    IF old_seq IS DISTINCT FROM new_seq THEN
      RAISE EXCEPTION 'The draft order cannot be rearranged' USING ERRCODE = '42501';
    END IF;

    IF old_picker IS NOT NULL AND old_picker = ANY (new_order) THEN
      IF new_order[new_turn + 1] IS DISTINCT FROM old_picker THEN
        RAISE EXCEPTION 'The current turn cannot be moved to someone else' USING ERRCODE = '42501';
      END IF;
    ELSIF new_turn > old_turn THEN
      RAISE EXCEPTION 'The current turn cannot be moved forward' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF COALESCE(NEW.marketplace_completed, false) AND NOT COALESCE(OLD.marketplace_completed, false)
     OR COALESCE(NEW.draft_completed, false) AND NOT COALESCE(OLD.draft_completed, false) THEN
    IF NOT (
      new_turn >= cardinality(new_order)
      OR (SELECT count(DISTINCT n.id) FROM unnest(new_order) AS n(id)
          WHERE NOT EXISTS (SELECT 1 FROM public.bots b WHERE b.id = n.id)) <= 1
    ) THEN
      RAISE EXCEPTION 'The draft still has picks left' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_league_draft_edits
  BEFORE UPDATE ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION public.guard_league_draft_edits();

-- Members can only create their own league data, for leagues they are in.
CREATE OR REPLACE FUNCTION public.create_league_data_for_user(user_id_input uuid, league_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'authenticated' AND (
    user_id_input IS DISTINCT FROM auth.uid()
    OR NOT EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = league_id_input
        AND (l.creator_id = auth.uid() OR auth.uid() = ANY (COALESCE(l.member_ids, ARRAY[]::uuid[])))
    )
  ) THEN
    RAISE EXCEPTION 'You can only set up your own team in a league you have joined' USING ERRCODE = '42501';
  END IF;
  PERFORM app_private.create_league_data_for_user(user_id_input, league_id_input);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_league_draft_edits() FROM PUBLIC, anon, authenticated;

REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
