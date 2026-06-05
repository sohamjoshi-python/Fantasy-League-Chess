-- Fix accept_trade for teams.player_ids UUID[].
-- Older versions cast player_id to text, causing "operator does not exist: uuid = text".

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

GRANT EXECUTE ON FUNCTION public.accept_trade(UUID, UUID) TO authenticated;
