-- Star Points System Migration with Bot Support
-- This migration adds a complete star points economy to fantasy chess, including bot support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add star_points to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS star_points INTEGER DEFAULT 50 NOT NULL;

-- Add star_points to bots
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS star_points INTEGER DEFAULT 50 NOT NULL;

-- Create player_marketplace table
CREATE TABLE IF NOT EXISTS public.player_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    seller_bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.chess_players(id) ON DELETE CASCADE,
    price INTEGER NOT NULL CHECK (price > 0),
    listed_at TIMESTAMPTZ DEFAULT NOW(),
    sold_at TIMESTAMPTZ,
    buyer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    buyer_bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'listed' CHECK (status IN ('listed', 'sold', 'cancelled'))
);

-- Create user_players table
CREATE TABLE IF NOT EXISTS public.user_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.chess_players(id) ON DELETE CASCADE,
    purchase_price INTEGER NOT NULL,
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    is_available BOOLEAN DEFAULT true
);

-- Create star_point_transactions table (if not already created)
CREATE TABLE IF NOT EXISTS public.star_point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('weekly_bonus', 'join_bonus', 'player_purchase', 'player_sale', 'trade', 'refund')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    related_player_id UUID REFERENCES public.chess_players(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    related_bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create player_marketplace table for buying/selling players
-- Add unique constraint for active listings (only one active listing per player per seller per league)
-- Note: We'll handle this constraint in the application logic instead of database constraint

-- Step 4: Create star_point_transactions table for tracking all transactions

-- Step 5: Create user_players table to track owned players (supports both users and bots)
-- Note: We'll handle uniqueness constraints in application logic
-- to avoid issues with partial unique indexes and ON CONFLICT

-- Step 6: Create trade_offers table for future trading functionality
CREATE TABLE IF NOT EXISTS public.trade_offers (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    sender_bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
    offered_players UUID[] DEFAULT '{}',
    requested_players UUID[] DEFAULT '{}',
    offered_star_points INTEGER DEFAULT 0,
    requested_star_points INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_marketplace_league ON public.player_marketplace (league_id);
CREATE INDEX IF NOT EXISTS idx_player_marketplace_status ON public.player_marketplace (status);
CREATE INDEX IF NOT EXISTS idx_player_marketplace_player ON public.player_marketplace (player_id);
CREATE INDEX IF NOT EXISTS idx_star_point_transactions_user ON public.star_point_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_star_point_transactions_bot ON public.star_point_transactions (bot_id);
CREATE INDEX IF NOT EXISTS idx_star_point_transactions_league ON public.star_point_transactions (league_id);
CREATE INDEX IF NOT EXISTS idx_user_players_user_league ON public.user_players (user_id, league_id);
CREATE INDEX IF NOT EXISTS idx_user_players_bot_league ON public.user_players (bot_id, league_id);
CREATE INDEX IF NOT EXISTS idx_user_players_player ON public.user_players (player_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_league ON public.trade_offers (league_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_sender ON public.trade_offers (sender_id, sender_bot_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_receiver ON public.trade_offers (receiver_id, receiver_bot_id);

-- Step 8: Enable Row Level Security
ALTER TABLE public.player_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.star_point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;

-- Step 9: RLS Policies for player_marketplace
DROP POLICY IF EXISTS "League members can view marketplace" ON public.player_marketplace;
CREATE POLICY "League members can view marketplace" ON public.player_marketplace
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leagues 
            WHERE id = league_id AND auth.uid() = ANY(member_ids)
        )
    );

DROP POLICY IF EXISTS "Users can list their own players" ON public.player_marketplace;
CREATE POLICY "Users can list their own players" ON public.player_marketplace
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can update their own listings" ON public.player_marketplace;
CREATE POLICY "Users can update their own listings" ON public.player_marketplace
    FOR UPDATE USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can delete their own listings" ON public.player_marketplace;
CREATE POLICY "Users can delete their own listings" ON public.player_marketplace
    FOR DELETE USING (auth.uid() = seller_id);

-- Step 10: RLS Policies for star_point_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.star_point_transactions;
CREATE POLICY "Users can view their own transactions" ON public.star_point_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create transactions" ON public.star_point_transactions;
CREATE POLICY "System can create transactions" ON public.star_point_transactions
    FOR INSERT WITH CHECK (true);

-- Step 11: RLS Policies for user_players
DROP POLICY IF EXISTS "Users can view their own players" ON public.user_players;
CREATE POLICY "Users can view their own players" ON public.user_players
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "League members can view all players" ON public.user_players;
CREATE POLICY "League members can view all players" ON public.user_players
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leagues 
            WHERE id = league_id AND auth.uid() = ANY(member_ids)
        )
    );

DROP POLICY IF EXISTS "Users can manage their own players" ON public.user_players;
CREATE POLICY "Users can manage their own players" ON public.user_players
    FOR ALL USING (auth.uid() = user_id);

-- Step 12: RLS Policies for trade_offers
DROP POLICY IF EXISTS "Users can view trade offers they're involved in" ON public.trade_offers;
CREATE POLICY "Users can view trade offers they're involved in" ON public.trade_offers
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

DROP POLICY IF EXISTS "Users can create trade offers" ON public.trade_offers;
CREATE POLICY "Users can create trade offers" ON public.trade_offers
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their own trade offers" ON public.trade_offers;
CREATE POLICY "Users can update their own trade offers" ON public.trade_offers
    FOR UPDATE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can respond to trade offers" ON public.trade_offers;
CREATE POLICY "Users can respond to trade offers" ON public.trade_offers
    FOR UPDATE USING (auth.uid() = receiver_id);

-- Step 13: Functions for star points management with bot support

-- Function to award weekly star points (includes bots)
CREATE OR REPLACE FUNCTION public.award_weekly_star_points()
RETURNS void AS $$
DECLARE
    league_record RECORD;
    member_record RECORD;
    bot_record RECORD;
BEGIN
    -- Loop through all active leagues
    FOR league_record IN 
        SELECT * FROM public.leagues 
        WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
    LOOP
        -- Award 50 star points to each human member
        FOR member_record IN 
            SELECT * FROM public.league_members WHERE league_id = league_record.id
        LOOP
            -- Update user's star points
            UPDATE public.users 
            SET star_points = star_points + 50 
            WHERE id = member_record.user_id;
            
            -- Record the transaction
            INSERT INTO public.star_point_transactions (
                user_id, 
                league_id, 
                transaction_type, 
                amount, 
                balance_after,
                description
            ) VALUES (
                member_record.user_id,
                league_record.id,
                'weekly_bonus',
                50,
                (SELECT star_points FROM public.users WHERE id = member_record.user_id),
                'Weekly star points bonus'
            );
        END LOOP;
        
        -- Award 50 star points to bot if league has one
        IF league_record.bot_id IS NOT NULL THEN
            -- Update bot's star points
            UPDATE public.bots 
            SET star_points = star_points + 50 
            WHERE id = league_record.bot_id;
            
            -- Record the transaction
            INSERT INTO public.star_point_transactions (
                bot_id, 
                league_id, 
                transaction_type, 
                amount, 
                balance_after,
                description
            ) VALUES (
                league_record.bot_id,
                league_record.id,
                'weekly_bonus',
                50,
                (SELECT star_points FROM public.bots WHERE id = league_record.bot_id),
                'Weekly star points bonus (Bot)'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award join bonus star points (supports both users and bots)
CREATE OR REPLACE FUNCTION public.award_join_bonus_star_points(
    user_uuid UUID DEFAULT NULL,
    bot_uuid UUID DEFAULT NULL,
    league_uuid UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Validate required parameters
    IF league_uuid IS NULL THEN
        RAISE EXCEPTION 'league_uuid is required';
    END IF;
    
    IF user_uuid IS NOT NULL THEN
        -- Award 50 star points to new human member
        UPDATE public.users 
        SET star_points = star_points + 50 
        WHERE id = user_uuid;
        
        -- Record the transaction
        INSERT INTO public.star_point_transactions (
            user_id, 
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description
        ) VALUES (
            user_uuid,
            league_uuid,
            'join_bonus',
            50,
            (SELECT star_points FROM public.users WHERE id = user_uuid),
            'League join bonus'
        );
    ELSIF bot_uuid IS NOT NULL THEN
        -- Award 50 star points to new bot
        UPDATE public.bots 
        SET star_points = star_points + 50 
        WHERE id = bot_uuid;
        
        -- Record the transaction
        INSERT INTO public.star_point_transactions (
            bot_id, 
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description
        ) VALUES (
            bot_uuid,
            league_uuid,
            'join_bonus',
            50,
            (SELECT star_points FROM public.bots WHERE id = bot_uuid),
            'League join bonus (Bot)'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate player price based on chess.com ELO
CREATE OR REPLACE FUNCTION public.calculate_player_price(player_elo INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Chess.com ELO-based pricing with strategic balance
    -- Players get 50⭐ per week, so prices need to force strategic choices
    RETURN CASE 
        WHEN player_elo >= 3000 THEN 50  -- Super elite (costs entire week's budget)
        WHEN player_elo >= 2800 THEN 40  -- Elite players (major investment)
        WHEN player_elo >= 2600 THEN 30  -- Strong players (significant cost)
        WHEN player_elo >= 2400 THEN 20  -- Good players (moderate investment)
        WHEN player_elo >= 2200 THEN 12  -- Decent players (affordable)
        WHEN player_elo >= 2000 THEN 8   -- Average players (budget-friendly)
        ELSE 3                           -- Minimum price for everyone else
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to buy a player from marketplace (supports both users and bots)
CREATE OR REPLACE FUNCTION public.buy_player_from_marketplace(
    marketplace_id UUID,
    buyer_uuid UUID DEFAULT NULL,
    buyer_bot_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    listing_record RECORD;
    buyer_star_points INTEGER;
    seller_star_points INTEGER;
BEGIN
    -- Validate required parameters
    IF marketplace_id IS NULL THEN
        RAISE EXCEPTION 'marketplace_id is required';
    END IF;
    
    IF buyer_uuid IS NULL AND buyer_bot_uuid IS NULL THEN
        RAISE EXCEPTION 'Either buyer_uuid or buyer_bot_uuid is required';
    END IF;
    -- Get the listing
    SELECT * INTO listing_record 
    FROM public.player_marketplace 
    WHERE id = marketplace_id AND status = 'listed';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if buyer has enough star points
    IF buyer_uuid IS NOT NULL THEN
        SELECT star_points INTO buyer_star_points 
        FROM public.users WHERE id = buyer_uuid;
    ELSIF buyer_bot_uuid IS NOT NULL THEN
        SELECT star_points INTO buyer_star_points 
        FROM public.bots WHERE id = buyer_bot_uuid;
    ELSE
        RETURN FALSE;
    END IF;
    
    IF buyer_star_points < listing_record.price THEN
        RETURN FALSE;
    END IF;
    
    -- Check if buyer owns the player
    IF EXISTS (
        SELECT 1 FROM public.user_players 
        WHERE (user_id = buyer_uuid OR bot_id = buyer_bot_uuid)
        AND league_id = listing_record.league_id 
        AND player_id = listing_record.player_id
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Begin transaction
    BEGIN
        -- Deduct star points from buyer
        IF buyer_uuid IS NOT NULL THEN
            UPDATE public.users 
            SET star_points = star_points - listing_record.price 
            WHERE id = buyer_uuid;
        ELSIF buyer_bot_uuid IS NOT NULL THEN
            UPDATE public.bots 
            SET star_points = star_points - listing_record.price 
            WHERE id = buyer_bot_uuid;
        END IF;
        
        -- Add star points to seller
        IF listing_record.seller_id IS NOT NULL THEN
            UPDATE public.users 
            SET star_points = star_points + listing_record.price 
            WHERE id = listing_record.seller_id;
        ELSIF listing_record.seller_bot_id IS NOT NULL THEN
            UPDATE public.bots 
            SET star_points = star_points + listing_record.price 
            WHERE id = listing_record.seller_bot_id;
        END IF;
        
        -- Transfer player ownership
        INSERT INTO public.user_players (
            user_id,
            bot_id,
            league_id, 
            player_id, 
            purchase_price
        ) VALUES (
            buyer_uuid,
            buyer_bot_uuid,
            listing_record.league_id,
            listing_record.player_id,
            listing_record.price
        );
        
        -- Remove player from seller's ownership
        DELETE FROM public.user_players 
        WHERE (user_id = listing_record.seller_id OR bot_id = listing_record.seller_bot_id)
        AND league_id = listing_record.league_id 
        AND player_id = listing_record.player_id;
        
        -- Update marketplace listing
        UPDATE public.player_marketplace 
        SET status = 'sold', 
            sold_at = NOW(), 
            buyer_id = buyer_uuid,
            buyer_bot_id = buyer_bot_uuid
        WHERE id = marketplace_id;
        
        -- Record buyer transaction
        INSERT INTO public.star_point_transactions (
            user_id,
            bot_id,
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description,
            related_player_id,
            related_user_id,
            related_bot_id
        ) VALUES (
            buyer_uuid,
            buyer_bot_uuid,
            listing_record.league_id,
            'player_purchase',
            -listing_record.price,
            (SELECT COALESCE(u.star_points, b.star_points) 
             FROM public.users u 
             FULL OUTER JOIN public.bots b ON b.id = buyer_bot_uuid 
             WHERE u.id = buyer_uuid OR b.id = buyer_bot_uuid),
            'Purchased player from marketplace',
            listing_record.player_id,
            listing_record.seller_id,
            listing_record.seller_bot_id
        );
        
        -- Record seller transaction
        INSERT INTO public.star_point_transactions (
            user_id,
            bot_id,
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description,
            related_player_id,
            related_user_id,
            related_bot_id
        ) VALUES (
            listing_record.seller_id,
            listing_record.seller_bot_id,
            listing_record.league_id,
            'player_sale',
            listing_record.price,
            (SELECT COALESCE(u.star_points, b.star_points) 
             FROM public.users u 
             FULL OUTER JOIN public.bots b ON b.id = listing_record.seller_bot_id 
             WHERE u.id = listing_record.seller_id OR b.id = listing_record.seller_bot_id),
            'Sold player on marketplace',
            listing_record.player_id,
            buyer_uuid,
            buyer_bot_uuid
        );
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list a player for sale (supports both users and bots)
CREATE OR REPLACE FUNCTION public.list_player_for_sale(
    user_uuid UUID DEFAULT NULL,
    bot_uuid UUID DEFAULT NULL,
    league_uuid UUID DEFAULT NULL,
    player_uuid UUID DEFAULT NULL,
    price INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate required parameters
    IF league_uuid IS NULL THEN
        RAISE EXCEPTION 'league_uuid is required';
    END IF;
    
    IF player_uuid IS NULL THEN
        RAISE EXCEPTION 'player_uuid is required';
    END IF;
    
    IF price IS NULL THEN
        RAISE EXCEPTION 'price is required';
    END IF;
    
    IF user_uuid IS NULL AND bot_uuid IS NULL THEN
        RAISE EXCEPTION 'Either user_uuid or bot_uuid is required';
    END IF;
    
    -- Check if user/bot owns the player
    IF NOT EXISTS (
        SELECT 1 FROM public.user_players 
        WHERE (user_id = user_uuid OR bot_id = bot_uuid)
        AND league_id = league_uuid 
        AND player_id = player_uuid
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check if player is already listed (application-level constraint)
    IF EXISTS (
        SELECT 1 FROM public.player_marketplace 
        WHERE (seller_id = user_uuid OR seller_bot_id = bot_uuid)
        AND league_id = league_uuid 
        AND player_id = player_uuid 
        AND status = 'listed'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Create marketplace listing
    INSERT INTO public.player_marketplace (
        league_id,
        seller_id,
        seller_bot_id,
        player_id,
        price
    ) VALUES (
        league_uuid,
        user_uuid,
        bot_uuid,
        player_uuid,
        price
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's available players for lineup (supports both users and bots)
CREATE OR REPLACE FUNCTION public.get_user_available_players(
    user_uuid UUID DEFAULT NULL,
    bot_uuid UUID DEFAULT NULL,
    league_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
    player_id UUID,
    player_name TEXT,
    player_elo INTEGER,
    purchase_price INTEGER,
    purchase_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Validate required parameters
    IF league_uuid IS NULL THEN
        RAISE EXCEPTION 'league_uuid is required';
    END IF;
    
    IF user_uuid IS NULL AND bot_uuid IS NULL THEN
        RAISE EXCEPTION 'Either user_uuid or bot_uuid is required';
    END IF;
    RETURN QUERY
    SELECT 
        up.player_id,
        cp.name,
        cp.elo,
        up.purchase_price,
        up.purchase_date
    FROM public.user_players up
    JOIN public.chess_players cp ON up.player_id = cp.id
    WHERE (up.user_id = user_uuid OR up.bot_id = bot_uuid)
    AND up.league_id = league_uuid
    AND up.is_available = true
    ORDER BY cp.elo DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sell player back to system (supports both users and bots)
CREATE OR REPLACE FUNCTION public.sell_player_to_system(
    user_uuid UUID DEFAULT NULL,
    bot_uuid UUID DEFAULT NULL,
    league_uuid UUID DEFAULT NULL,
    player_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_player_record RECORD;
    refund_amount INTEGER;
BEGIN
    -- Validate required parameters
    IF league_uuid IS NULL THEN
        RAISE EXCEPTION 'league_uuid is required';
    END IF;
    
    IF player_uuid IS NULL THEN
        RAISE EXCEPTION 'player_uuid is required';
    END IF;
    
    IF user_uuid IS NULL AND bot_uuid IS NULL THEN
        RAISE EXCEPTION 'Either user_uuid or bot_uuid is required';
    END IF;
    -- Get user's/bot's player record
    SELECT * INTO user_player_record 
    FROM public.user_players 
    WHERE (user_id = user_uuid OR bot_id = bot_uuid)
    AND league_id = league_uuid 
    AND player_id = player_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate refund amount (70% of purchase price)
    refund_amount := FLOOR(user_player_record.purchase_price * 0.7);
    
    -- Begin transaction
    BEGIN
        -- Add star points to user/bot
        IF user_uuid IS NOT NULL THEN
            UPDATE public.users 
            SET star_points = star_points + refund_amount 
            WHERE id = user_uuid;
        ELSIF bot_uuid IS NOT NULL THEN
            UPDATE public.bots 
            SET star_points = star_points + refund_amount 
            WHERE id = bot_uuid;
        END IF;
        
        -- Remove player from user's/bot's collection
        DELETE FROM public.user_players 
        WHERE id = user_player_record.id;
        
        -- Record transaction
        INSERT INTO public.star_point_transactions (
            user_id,
            bot_id,
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description,
            related_player_id
        ) VALUES (
            user_uuid,
            bot_uuid,
            league_uuid,
            'player_sale',
            refund_amount,
            (SELECT COALESCE(u.star_points, b.star_points) 
             FROM public.users u 
             FULL OUTER JOIN public.bots b ON b.id = bot_uuid 
             WHERE u.id = user_uuid OR b.id = bot_uuid),
            'Sold player back to system',
            player_uuid
        );
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to buy from initial marketplace (supports both users and bots)
CREATE OR REPLACE FUNCTION public.buy_from_initial_marketplace(
    user_uuid UUID DEFAULT NULL,
    bot_uuid UUID DEFAULT NULL,
    league_uuid UUID DEFAULT NULL,
    player_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    listing_record RECORD;
    buyer_star_points INTEGER;
BEGIN
    -- Validate required parameters
    IF league_uuid IS NULL THEN
        RAISE EXCEPTION 'league_uuid is required';
    END IF;
    
    IF player_uuid IS NULL THEN
        RAISE EXCEPTION 'player_uuid is required';
    END IF;
    
    IF user_uuid IS NULL AND bot_uuid IS NULL THEN
        RAISE EXCEPTION 'Either user_uuid or bot_uuid is required';
    END IF;
    -- Get the initial marketplace listing
    SELECT * INTO listing_record 
    FROM public.player_marketplace 
    WHERE league_id = league_uuid 
    AND player_id = player_uuid 
    AND seller_id IS NULL 
    AND seller_bot_id IS NULL
    AND status = 'listed';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if buyer has enough star points
    IF user_uuid IS NOT NULL THEN
        SELECT star_points INTO buyer_star_points 
        FROM public.users WHERE id = user_uuid;
    ELSIF bot_uuid IS NOT NULL THEN
        SELECT star_points INTO buyer_star_points 
        FROM public.bots WHERE id = bot_uuid;
    ELSE
        RETURN FALSE;
    END IF;
    
    IF buyer_star_points < listing_record.price THEN
        RETURN FALSE;
    END IF;
    
    -- Check if buyer already owns the player
    IF EXISTS (
        SELECT 1 FROM public.user_players 
        WHERE (user_id = user_uuid OR bot_id = bot_uuid)
        AND league_id = league_uuid 
        AND player_id = player_uuid
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Begin transaction
    BEGIN
        -- Deduct star points from buyer
        IF user_uuid IS NOT NULL THEN
            UPDATE public.users 
            SET star_points = star_points - listing_record.price 
            WHERE id = user_uuid;
        ELSIF bot_uuid IS NOT NULL THEN
            UPDATE public.bots 
            SET star_points = star_points - listing_record.price 
            WHERE id = bot_uuid;
        END IF;
        
        -- Add player to user's/bot's collection
        INSERT INTO public.user_players (
            user_id,
            bot_id,
            league_id, 
            player_id, 
            purchase_price
        ) VALUES (
            user_uuid,
            bot_uuid,
            league_uuid,
            player_uuid,
            listing_record.price
        );
        
        -- Remove from initial marketplace
        DELETE FROM public.player_marketplace 
        WHERE id = listing_record.id;
        
        -- Record transaction
        INSERT INTO public.star_point_transactions (
            user_id,
            bot_id,
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description,
            related_player_id
        ) VALUES (
            user_uuid,
            bot_uuid,
            league_uuid,
            'player_purchase',
            -listing_record.price,
            (SELECT COALESCE(u.star_points, b.star_points) 
             FROM public.users u 
             FULL OUTER JOIN public.bots b ON b.id = bot_uuid 
             WHERE u.id = user_uuid OR b.id = bot_uuid),
            'Purchased player from initial marketplace',
            player_uuid
        );
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get marketplace listings (includes bot listings)
CREATE OR REPLACE FUNCTION public.get_marketplace_listings(league_uuid UUID)
RETURNS TABLE (
    listing_id UUID,
    player_id UUID,
    player_name TEXT,
    player_elo INTEGER,
    player_country TEXT,
    price INTEGER,
    seller_name TEXT,
    listed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.player_id,
        cp.name,
        cp.elo,
        cp.country,
        pm.price,
        COALESCE(lm.display_name, b.name, 'System') as seller_name,
        pm.listed_at
    FROM public.player_marketplace pm
    JOIN public.chess_players cp ON pm.player_id = cp.id
    LEFT JOIN public.league_members lm ON pm.seller_id = lm.user_id AND lm.league_id = league_uuid
    LEFT JOIN public.bots b ON pm.seller_bot_id = b.id
    WHERE pm.league_id = league_uuid 
    AND pm.status = 'listed'
    ORDER BY pm.listed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's star points history (supports both users and bots)
CREATE OR REPLACE FUNCTION public.get_user_star_points_history(
    user_uuid UUID DEFAULT NULL,
    bot_uuid UUID DEFAULT NULL,
    league_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
    transaction_type TEXT,
    amount INTEGER,
    balance_after INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        spt.transaction_type,
        spt.amount,
        spt.balance_after,
        spt.description,
        spt.created_at
    FROM public.star_point_transactions spt
    WHERE (spt.user_id = user_uuid OR spt.bot_id = bot_uuid)
    AND spt.league_id = league_uuid
    ORDER BY spt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get league star points leaderboard (includes bots)
CREATE OR REPLACE FUNCTION public.get_star_points_leaderboard(league_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    bot_id UUID,
    display_name TEXT,
    star_points INTEGER,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        NULL as bot_id,
        lm.display_name,
        u.star_points,
        ROW_NUMBER() OVER (ORDER BY u.star_points DESC) as rank
    FROM public.users u
    JOIN public.league_members lm ON u.id = lm.user_id AND lm.league_id = league_uuid
    
    UNION ALL
    
    SELECT 
        NULL as user_id,
        b.id as bot_id,
        b.name || ' 🤖' as display_name,
        b.star_points,
        ROW_NUMBER() OVER (ORDER BY b.star_points DESC) as rank
    FROM public.bots b
    WHERE b.league_id = league_uuid
    
    ORDER BY star_points DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-buy players for bots (bot AI for marketplace)
CREATE OR REPLACE FUNCTION public.auto_buy_players_for_bot(
    bot_uuid UUID,
    league_uuid UUID,
    max_players INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
    bot_star_points INTEGER;
    player_record RECORD;
    players_bought INTEGER := 0;
BEGIN
    -- Get bot's star points
    SELECT star_points INTO bot_star_points 
    FROM public.bots WHERE id = bot_uuid;
    
    -- Get bot's current player count
    SELECT COUNT(*) INTO players_bought
    FROM public.user_players 
    WHERE bot_id = bot_uuid AND league_id = league_uuid;
    
    -- If bot already has max players, don't buy more
    IF players_bought >= max_players THEN
        RETURN TRUE;
    END IF;
    
    -- Try to buy players from initial marketplace (highest ELO first)
    FOR player_record IN 
        SELECT 
            pm.id as listing_id,
            pm.player_id,
            pm.price,
            cp.elo
        FROM public.player_marketplace pm
        JOIN public.chess_players cp ON pm.player_id = cp.id
        WHERE pm.league_id = league_uuid 
        AND pm.seller_id IS NULL 
        AND pm.seller_bot_id IS NULL
        AND pm.status = 'listed'
        AND pm.price <= bot_star_points
        ORDER BY cp.elo DESC
        LIMIT (max_players - players_bought)
    LOOP
        -- Attempt to buy the player
        IF public.buy_from_initial_marketplace(
            user_uuid := NULL,
            bot_uuid := bot_uuid,
            league_uuid := league_uuid,
            player_uuid := player_record.player_id
        ) THEN
            players_bought := players_bought + 1;
            bot_star_points := bot_star_points - player_record.price;
        END IF;
        
        -- Stop if bot runs out of star points
        IF bot_star_points <= 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Drop and recreate the add_user_to_league function to award join bonus
DROP FUNCTION IF EXISTS public.add_user_to_league(UUID, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.add_user_to_league(
    league_uuid UUID,
    user_uuid UUID,
    display_name TEXT,
    user_email TEXT
)
RETURNS void AS $$
BEGIN
    -- Add user to league members
    INSERT INTO public.league_members (league_id, user_id, display_name, email)
    VALUES (league_uuid, user_uuid, display_name, user_email)
    ON CONFLICT (league_id, user_id) DO NOTHING;
    
    -- Update league member_ids array
    UPDATE public.leagues 
    SET member_ids = array_append(member_ids, user_uuid)
    WHERE id = league_uuid AND NOT (user_uuid = ANY(member_ids));
    
    -- Award join bonus star points
    PERFORM public.award_join_bonus_star_points(user_uuid := user_uuid, league_uuid := league_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Create a function to populate initial player marketplace
CREATE OR REPLACE FUNCTION public.populate_initial_marketplace(league_uuid UUID)
RETURNS void AS $$
DECLARE
    player_record RECORD;
    calculated_price INTEGER;
BEGIN
    -- Add all chess players to the marketplace with calculated prices
    FOR player_record IN 
        SELECT * FROM public.chess_players ORDER BY elo DESC
    LOOP
        calculated_price := public.calculate_player_price(player_record.elo);
        
        -- Create a "system" listing (no seller_id/seller_bot_id means it's available for initial purchase)
        INSERT INTO public.player_marketplace (
            league_id,
            player_id,
            price
        ) VALUES (
            league_uuid,
            player_record.id,
            calculated_price
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 16: Create a function to award star points to existing bots
CREATE OR REPLACE FUNCTION public.award_star_points_to_existing_bots()
RETURNS void AS $$
DECLARE
    bot_record RECORD;
BEGIN
    -- Award 50 star points to all existing bots
    FOR bot_record IN 
        SELECT * FROM public.bots
    LOOP
        UPDATE public.bots 
        SET star_points = 50 
        WHERE id = bot_record.id;
        
        -- Record the transaction
        INSERT INTO public.star_point_transactions (
            bot_id, 
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description
        ) VALUES (
            bot_record.id,
            bot_record.league_id,
            'join_bonus',
            50,
            50,
            'Initial star points for existing bot'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 17: Create a function to migrate existing teams to user_players
CREATE OR REPLACE FUNCTION public.migrate_existing_teams_to_user_players()
RETURNS void AS $$
DECLARE
    team_record RECORD;
    p_player_id UUID;
    calculated_price INTEGER;
BEGIN
    -- Migrate human user teams
    FOR team_record IN 
        SELECT * FROM public.teams WHERE user_id IS NOT NULL
    LOOP
        -- For each player in the team, add to user_players with calculated price
        FOREACH p_player_id IN ARRAY team_record.player_ids
        LOOP
            -- Calculate price based on player's ELO
            SELECT public.calculate_player_price(elo) INTO calculated_price
            FROM public.chess_players WHERE id = p_player_id;
            
            -- Check if player is already owned by this user
            IF NOT EXISTS (
                SELECT 1 FROM public.user_players 
                WHERE user_id = team_record.user_id 
                AND league_id = team_record.league_id 
                AND player_id = p_player_id
            ) THEN
                -- Insert into user_players
                INSERT INTO public.user_players (
                    user_id,
                    bot_id,
                    league_id,
                    player_id,
                    purchase_price
                ) VALUES (
                    team_record.user_id,
                    NULL,
                    team_record.league_id,
                    p_player_id,
                    calculated_price
                );
            END IF;
        END LOOP;
    END LOOP;
    
    -- Migrate bot teams
    FOR team_record IN 
        SELECT * FROM public.teams WHERE bot_id IS NOT NULL
    LOOP
        -- For each player in the team, add to user_players with calculated price
        FOREACH p_player_id IN ARRAY team_record.player_ids
        LOOP
            -- Calculate price based on player's ELO
            SELECT public.calculate_player_price(elo) INTO calculated_price
            FROM public.chess_players WHERE id = p_player_id;
            
            -- Check if player is already owned by this bot
            IF NOT EXISTS (
                SELECT 1 FROM public.user_players 
                WHERE bot_id = team_record.bot_id 
                AND league_id = team_record.league_id 
                AND player_id = p_player_id
            ) THEN
                -- Insert into user_players
                INSERT INTO public.user_players (
                    user_id,
                    bot_id,
                    league_id,
                    player_id,
                    purchase_price
                ) VALUES (
                    NULL,
                    team_record.bot_id,
                    team_record.league_id,
                    p_player_id,
                    calculated_price
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 18: Execute migration functions
-- Award star points to existing bots
SELECT public.award_star_points_to_existing_bots();

-- Migrate existing teams to user_players
SELECT public.migrate_existing_teams_to_user_players();

-- Populate initial marketplace for all existing leagues
DO $$
DECLARE
    league_record RECORD;
BEGIN
    FOR league_record IN 
        SELECT * FROM public.leagues
    LOOP
        PERFORM public.populate_initial_marketplace(league_record.id);
    END LOOP;
END $$; 