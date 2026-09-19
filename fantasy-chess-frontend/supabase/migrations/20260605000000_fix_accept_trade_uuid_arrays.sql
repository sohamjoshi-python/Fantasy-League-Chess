-- Fix trading functions for UUID arrays.
-- Older schemas/functions mixed UUID values with TEXT[] arrays, causing
-- "operator does not exist: uuid = text" while creating or accepting trades.

CREATE OR REPLACE FUNCTION public._player_ref_text_array_to_uuid_array(p_refs TEXT[])
RETURNS UUID[]
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(array_agg(resolved_id ORDER BY ord), ARRAY[]::UUID[])
    FROM (
        SELECT
            refs.ord,
            CASE
                WHEN refs.ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                    THEN refs.ref::UUID
                ELSE cp.id
            END AS resolved_id
        FROM unnest(COALESCE(p_refs, ARRAY[]::TEXT[])) WITH ORDINALITY AS refs(ref, ord)
        LEFT JOIN public.chess_players cp
          ON cp.name = refs.ref
          OR cp.id::TEXT = refs.ref
        WHERE refs.ref IS NOT NULL
          AND refs.ref <> ''
    ) resolved
    WHERE resolved_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public._uuid_text_array_to_uuid_array(p_refs TEXT[])
RETURNS UUID[]
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(array_agg(ref::UUID ORDER BY ord), ARRAY[]::UUID[])
    FROM unnest(COALESCE(p_refs, ARRAY[]::TEXT[])) WITH ORDINALITY AS refs(ref, ord)
    WHERE ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'teams'
          AND column_name = 'player_ids'
          AND udt_name = '_text'
    ) THEN
        ALTER TABLE public.teams
        ALTER COLUMN player_ids DROP DEFAULT;

        ALTER TABLE public.teams
        ALTER COLUMN player_ids TYPE UUID[]
        USING public._player_ref_text_array_to_uuid_array(player_ids);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'lineups'
          AND column_name = 'player_ids'
          AND udt_name = '_text'
    ) THEN
        ALTER TABLE public.lineups
        ALTER COLUMN player_ids DROP DEFAULT;

        ALTER TABLE public.lineups
        ALTER COLUMN player_ids TYPE UUID[]
        USING public._player_ref_text_array_to_uuid_array(player_ids);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'leagues'
          AND column_name = 'member_ids'
          AND udt_name = '_text'
    ) THEN
        ALTER TABLE public.leagues
        ALTER COLUMN member_ids DROP DEFAULT;

        ALTER TABLE public.leagues
        ALTER COLUMN member_ids TYPE UUID[]
        USING public._uuid_text_array_to_uuid_array(member_ids);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'leagues'
          AND column_name = 'draft_order'
          AND udt_name = '_text'
    ) THEN
        ALTER TABLE public.leagues
        ALTER COLUMN draft_order DROP DEFAULT;

        ALTER TABLE public.leagues
        ALTER COLUMN draft_order TYPE UUID[]
        USING public._uuid_text_array_to_uuid_array(draft_order);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'leagues'
          AND column_name = 'marketplace_order'
          AND udt_name = '_text'
    ) THEN
        ALTER TABLE public.leagues
        ALTER COLUMN marketplace_order DROP DEFAULT;

        ALTER TABLE public.leagues
        ALTER COLUMN marketplace_order TYPE UUID[]
        USING public._uuid_text_array_to_uuid_array(marketplace_order);
    END IF;

    ALTER TABLE public.teams
    ALTER COLUMN player_ids SET DEFAULT ARRAY[]::UUID[];

    ALTER TABLE public.lineups
    ALTER COLUMN player_ids SET DEFAULT ARRAY[]::UUID[];

    ALTER TABLE public.leagues
    ALTER COLUMN member_ids SET DEFAULT ARRAY[]::UUID[];

    ALTER TABLE public.leagues
    ALTER COLUMN draft_order SET DEFAULT ARRAY[]::UUID[];

    ALTER TABLE public.leagues
    ALTER COLUMN marketplace_order SET DEFAULT ARRAY[]::UUID[];
END;
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

GRANT EXECUTE ON FUNCTION public.create_trade(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_trade(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public._player_ref_text_array_to_uuid_array(TEXT[]);
DROP FUNCTION IF EXISTS public._uuid_text_array_to_uuid_array(TEXT[]);
