-- Enable RLS on trades / trade_notifications (advisor: RLS disabled, unrestricted).
-- Direct client access is SELECT (and own-notification UPDATE) only.
-- Writes go through SECURITY DEFINER RPCs that require auth.uid().

CREATE OR REPLACE FUNCTION public.user_is_league_participant(p_league_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leagues l
    WHERE l.id = p_league_id
      AND (
        auth.uid() = l.creator_id
        OR auth.uid() = ANY(COALESCE(l.member_ids, ARRAY[]::uuid[]))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_is_league_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_league_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_league_participant(uuid) TO service_role;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['trades', 'trade_notifications', 'trades_notification']
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', t);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', t);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    END IF;
  END LOOP;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.trade_notifications') IS NOT NULL THEN
    EXECUTE 'GRANT UPDATE (seen) ON public.trade_notifications TO authenticated';
  END IF;
END
$$;

DROP POLICY IF EXISTS "trades_select_policy" ON public.trades;
DROP POLICY IF EXISTS "trades_insert_policy" ON public.trades;
DROP POLICY IF EXISTS "trades_update_policy" ON public.trades;
DROP POLICY IF EXISTS "trades_delete_policy" ON public.trades;
DROP POLICY IF EXISTS "league_creators_can_view_trades" ON public.trades;
DROP POLICY IF EXISTS trades_select_league_members ON public.trades;

CREATE POLICY trades_select_league_members
  ON public.trades
  FOR SELECT
  TO authenticated
  USING (public.user_is_league_participant(league_id));

DO $$
BEGIN
  IF to_regclass('public.trade_notifications') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "trade_notifications_select_policy" ON public.trade_notifications';
  EXECUTE 'DROP POLICY IF EXISTS "trade_notifications_insert_policy" ON public.trade_notifications';
  EXECUTE 'DROP POLICY IF EXISTS "trade_notifications_update_policy" ON public.trade_notifications';
  EXECUTE 'DROP POLICY IF EXISTS "trade_notifications_delete_policy" ON public.trade_notifications';
  EXECUTE 'DROP POLICY IF EXISTS "league_creators_can_view_notifications" ON public.trade_notifications';
  EXECUTE 'DROP POLICY IF EXISTS trade_notifications_select_own ON public.trade_notifications';
  EXECUTE 'DROP POLICY IF EXISTS trade_notifications_update_own ON public.trade_notifications';

  EXECUTE $p$
    CREATE POLICY trade_notifications_select_own
      ON public.trade_notifications
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid())
  $p$;

  EXECUTE $p$
    CREATE POLICY trade_notifications_update_own
      ON public.trade_notifications
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())
  $p$;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.trades_notification') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS trades_notification_select_own ON public.trades_notification';
    EXECUTE 'DROP POLICY IF EXISTS trades_notification_update_own ON public.trades_notification';
    EXECUTE $p$
      CREATE POLICY trades_notification_select_own
        ON public.trades_notification
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $p$;
    EXECUTE $p$
      CREATE POLICY trades_notification_update_own
        ON public.trades_notification
        FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid())
    $p$;
    EXECUTE 'GRANT UPDATE (seen) ON public.trades_notification TO authenticated';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.create_trade(
    p_league_id UUID,
    p_seller_id UUID,
    p_player_id UUID,
    p_price INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trade_id UUID;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_seller_id THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_price <= 0 THEN
        RAISE EXCEPTION 'Price must be greater than 0';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.leagues
        WHERE id = p_league_id
          AND p_seller_id = ANY(COALESCE(member_ids, ARRAY[]::UUID[]))
    ) THEN
        RAISE EXCEPTION 'Seller is not a member of this league';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.teams
        WHERE league_id = p_league_id
          AND user_id = p_seller_id
          AND p_player_id = ANY(COALESCE(player_ids, ARRAY[]::UUID[]))
    ) THEN
        RAISE EXCEPTION 'Player not owned by seller in this league';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.trades
        WHERE league_id = p_league_id
          AND seller_id = p_seller_id
          AND player_id = p_player_id
          AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'This player is already listed for trade';
    END IF;

    INSERT INTO public.trades (league_id, seller_id, player_id, price, expires_at)
    VALUES (p_league_id, p_seller_id, p_player_id, p_price, NOW() + INTERVAL '72 hours')
    RETURNING id INTO v_trade_id;

    INSERT INTO public.trade_notifications (trade_id, user_id)
    SELECT v_trade_id, member_id
    FROM (
        SELECT unnest(COALESCE(member_ids, ARRAY[]::UUID[])) AS member_id
        FROM public.leagues
        WHERE id = p_league_id
    ) league_members
    WHERE member_id <> p_seller_id
      AND EXISTS (
          SELECT 1
          FROM auth.users auth_user
          WHERE auth_user.id = member_id
      );

    RETURN v_trade_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_trade(
    p_trade_id UUID,
    p_buyer_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    trade_record RECORD;
    buyer_coins INTEGER;
    buyer_balance_after INTEGER;
    seller_balance_after INTEGER;
    player_name TEXT;
    has_balance_after BOOLEAN;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_buyer_id THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO trade_record
    FROM public.trades
    WHERE id = p_trade_id
      AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trade not found or not pending';
    END IF;

    IF trade_record.seller_id = p_buyer_id THEN
        RAISE EXCEPTION 'You cannot accept your own trade';
    END IF;

    IF NOT public.user_is_league_participant(trade_record.league_id) THEN
        RAISE EXCEPTION 'You are not a member of this league';
    END IF;

    SELECT name INTO player_name
    FROM public.chess_players
    WHERE id = trade_record.player_id;

    IF player_name IS NULL THEN
        RAISE EXCEPTION 'Player not found';
    END IF;

    SELECT coin_balance INTO buyer_coins
    FROM public.league_coin_balances
    WHERE user_id = p_buyer_id
      AND league_id = trade_record.league_id
    FOR UPDATE;

    IF buyer_coins IS NULL THEN
        RAISE EXCEPTION 'Buyer coin balance not found';
    END IF;

    IF buyer_coins < trade_record.price THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    INSERT INTO public.teams (user_id, league_id, player_ids)
    VALUES (p_buyer_id, trade_record.league_id, ARRAY[]::UUID[])
    ON CONFLICT (user_id, league_id) DO NOTHING;

    IF NOT EXISTS (
        SELECT 1
        FROM public.teams
        WHERE league_id = trade_record.league_id
          AND user_id = trade_record.seller_id
          AND trade_record.player_id = ANY(COALESCE(player_ids, ARRAY[]::UUID[]))
    ) THEN
        RAISE EXCEPTION 'Seller no longer owns this player';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.teams
        WHERE league_id = trade_record.league_id
          AND user_id = p_buyer_id
          AND trade_record.player_id = ANY(COALESCE(player_ids, ARRAY[]::UUID[]))
    ) THEN
        RAISE EXCEPTION 'Buyer already owns this player';
    END IF;

    IF (
        SELECT COALESCE(array_length(player_ids, 1), 0)
        FROM public.teams
        WHERE league_id = trade_record.league_id
          AND user_id = p_buyer_id
    ) >= 10 THEN
        RAISE EXCEPTION 'Team is full (max 10 players)';
    END IF;

    UPDATE public.trades
    SET status = 'accepted',
        buyer_id = p_buyer_id,
        accepted_at = NOW()
    WHERE id = p_trade_id;

    UPDATE public.teams
    SET player_ids = array_remove(COALESCE(player_ids, ARRAY[]::UUID[]), trade_record.player_id)
    WHERE league_id = trade_record.league_id
      AND user_id = trade_record.seller_id;

    UPDATE public.teams
    SET player_ids = COALESCE(player_ids, ARRAY[]::UUID[]) || trade_record.player_id
    WHERE league_id = trade_record.league_id
      AND user_id = p_buyer_id;

    UPDATE public.league_coin_balances
    SET coin_balance = coin_balance - trade_record.price,
        updated_at = NOW()
    WHERE user_id = p_buyer_id
      AND league_id = trade_record.league_id
    RETURNING coin_balance INTO buyer_balance_after;

    UPDATE public.league_coin_balances
    SET coin_balance = coin_balance + trade_record.price,
        updated_at = NOW()
    WHERE user_id = trade_record.seller_id
      AND league_id = trade_record.league_id
    RETURNING coin_balance INTO seller_balance_after;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'coin_transactions'
          AND column_name = 'balance_after'
    ) INTO has_balance_after;

    IF has_balance_after THEN
        EXECUTE
            'INSERT INTO public.coin_transactions
                (user_id, league_id, transaction_type, amount, balance_after, description, created_at)
             VALUES
                ($1, $2, $3, $4, $5, $6, NOW()),
                ($7, $8, $9, $10, $11, $12, NOW())'
        USING
            p_buyer_id,
            trade_record.league_id,
            'player_purchase',
            -trade_record.price,
            buyer_balance_after,
            'Bought ' || player_name || ' via trade',
            trade_record.seller_id,
            trade_record.league_id,
            'player_sale',
            trade_record.price,
            seller_balance_after,
            'Sold ' || player_name || ' via trade';
    ELSE
        INSERT INTO public.coin_transactions (
            user_id, league_id, transaction_type, amount, description, created_at
        )
        VALUES
            (p_buyer_id, trade_record.league_id, 'player_purchase', -trade_record.price,
             'Bought ' || player_name || ' via trade', NOW()),
            (trade_record.seller_id, trade_record.league_id, 'player_sale', trade_record.price,
             'Sold ' || player_name || ' via trade', NOW());
    END IF;

    UPDATE public.trade_notifications
    SET seen = true
    WHERE trade_id = p_trade_id
      AND user_id = p_buyer_id;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_trade(
    p_trade_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    trade_record RECORD;
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL OR v_user_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO trade_record
    FROM public.trades
    WHERE id = p_trade_id
      AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trade not found or not pending';
    END IF;

    IF trade_record.seller_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'Only the seller can cancel the trade';
    END IF;

    UPDATE public.trades
    SET status = 'cancelled',
        cancelled_at = NOW()
    WHERE id = p_trade_id;

    UPDATE public.trade_notifications
    SET seen = true
    WHERE trade_id = p_trade_id;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_trades(
    p_user_id UUID,
    p_league_id UUID
)
RETURNS TABLE (
    trade_id UUID,
    player_name TEXT,
    player_elo INTEGER,
    price INTEGER,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_seller BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.user_is_league_participant(p_league_id) THEN
        RAISE EXCEPTION 'You are not a member of this league';
    END IF;

    RETURN QUERY
    SELECT
        t.id as trade_id,
        cp.name as player_name,
        cp.elo as player_elo,
        t.price,
        t.status,
        t.created_at,
        t.expires_at,
        (t.seller_id = p_user_id) as is_seller
    FROM public.trades t
    JOIN public.chess_players cp ON t.player_id = cp.id
    WHERE t.league_id = p_league_id
      AND (t.seller_id = p_user_id OR t.buyer_id = p_user_id)
    ORDER BY t.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.get_trade_notifications(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_trade_notifications(UUID);

CREATE OR REPLACE FUNCTION public.get_trade_notifications(
    p_user_id UUID,
    p_league_id UUID
)
RETURNS TABLE (
    notification_id UUID,
    trade_id UUID,
    seller_name TEXT,
    player_name TEXT,
    player_elo INTEGER,
    price INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    seen BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.user_is_league_participant(p_league_id) THEN
        RAISE EXCEPTION 'You are not a member of this league';
    END IF;

    RETURN QUERY
    SELECT
        tn.id as notification_id,
        t.id as trade_id,
        u.username as seller_name,
        cp.name as player_name,
        cp.elo as player_elo,
        t.price,
        t.created_at,
        tn.seen
    FROM public.trade_notifications tn
    JOIN public.trades t ON tn.trade_id = t.id
    JOIN public.users u ON t.seller_id = u.id
    JOIN public.chess_players cp ON t.player_id = cp.id
    WHERE tn.user_id = p_user_id
      AND t.league_id = p_league_id
      AND t.status = 'pending'
    ORDER BY t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_seen(
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.trade_notifications
    SET seen = true
    WHERE id = p_notification_id
      AND user_id = auth.uid();

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.create_trade(UUID, UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_trade(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_trade(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_trades(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_trade_notifications(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_notification_seen(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_trade(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_trade(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trade(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trades(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trade_notifications(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_seen(UUID) TO authenticated;

DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.expire_old_trades() FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.expire_old_trades() FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.expire_old_trades() FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.expire_old_trades() TO service_role';
EXCEPTION
  WHEN undefined_function THEN NULL;
END
$$;

DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.cleanup_expired_trades() FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.cleanup_expired_trades() FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.cleanup_expired_trades() FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.cleanup_expired_trades() TO service_role';
EXCEPTION
  WHEN undefined_function THEN NULL;
END
$$;
