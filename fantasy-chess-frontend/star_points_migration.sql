-- Star Points System Migration
-- This migration adds a complete star points economy to fantasy chess

-- Step 1: Add star_points column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS star_points INTEGER DEFAULT 50 NOT NULL;

-- Step 2: Create player_marketplace table for buying/selling players
CREATE TABLE IF NOT EXISTS public.player_marketplace (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.chess_players(id) ON DELETE CASCADE,
    price INTEGER NOT NULL CHECK (price > 0),
    listed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_at TIMESTAMP WITH TIME ZONE,
    buyer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'listed' CHECK (status IN ('listed', 'sold', 'cancelled')),
    UNIQUE(league_id, seller_id, player_id, status) WHERE status = 'listed'
);

-- Step 3: Create star_point_transactions table for tracking all transactions
CREATE TABLE IF NOT EXISTS public.star_point_transactions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('weekly_bonus', 'join_bonus', 'player_purchase', 'player_sale', 'trade', 'refund')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    related_player_id UUID REFERENCES public.chess_players(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create user_players table to track owned players
CREATE TABLE IF NOT EXISTS public.user_players (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.chess_players(id) ON DELETE CASCADE,
    purchase_price INTEGER NOT NULL,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_available BOOLEAN DEFAULT true,
    UNIQUE(user_id, league_id, player_id)
);

-- Step 5: Create trade_offers table for future trading functionality
CREATE TABLE IF NOT EXISTS public.trade_offers (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    offered_players UUID[] DEFAULT '{}',
    requested_players UUID[] DEFAULT '{}',
    offered_star_points INTEGER DEFAULT 0,
    requested_star_points INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_marketplace_league ON public.player_marketplace (league_id);
CREATE INDEX IF NOT EXISTS idx_player_marketplace_status ON public.player_marketplace (status);
CREATE INDEX IF NOT EXISTS idx_player_marketplace_player ON public.player_marketplace (player_id);
CREATE INDEX IF NOT EXISTS idx_star_point_transactions_user ON public.star_point_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_star_point_transactions_league ON public.star_point_transactions (league_id);
CREATE INDEX IF NOT EXISTS idx_user_players_user_league ON public.user_players (user_id, league_id);
CREATE INDEX IF NOT EXISTS idx_user_players_player ON public.user_players (player_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_league ON public.trade_offers (league_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_sender ON public.trade_offers (sender_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_receiver ON public.trade_offers (receiver_id);

-- Step 7: Enable Row Level Security
ALTER TABLE public.player_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.star_point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;

-- Step 8: RLS Policies for player_marketplace
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

-- Step 9: RLS Policies for star_point_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.star_point_transactions;
CREATE POLICY "Users can view their own transactions" ON public.star_point_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create transactions" ON public.star_point_transactions;
CREATE POLICY "System can create transactions" ON public.star_point_transactions
    FOR INSERT WITH CHECK (true);

-- Step 10: RLS Policies for user_players
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

-- Step 11: RLS Policies for trade_offers
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

-- Step 12: Functions for star points management

-- Function to award weekly star points
CREATE OR REPLACE FUNCTION public.award_weekly_star_points()
RETURNS void AS $$
DECLARE
    league_record RECORD;
    member_record RECORD;
BEGIN
    -- Loop through all active leagues
    FOR league_record IN 
        SELECT * FROM public.leagues 
        WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
    LOOP
        -- Award 50 star points to each member
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
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award join bonus star points
CREATE OR REPLACE FUNCTION public.award_join_bonus_star_points(user_uuid UUID, league_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Award 50 star points to new member
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

-- Function to buy a player from marketplace
CREATE OR REPLACE FUNCTION public.buy_player_from_marketplace(
    marketplace_id UUID,
    buyer_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    listing_record RECORD;
    buyer_star_points INTEGER;
    seller_star_points INTEGER;
BEGIN
    -- Get the listing
    SELECT * INTO listing_record 
    FROM public.player_marketplace 
    WHERE id = marketplace_id AND status = 'listed';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if buyer has enough star points
    SELECT star_points INTO buyer_star_points 
    FROM public.users WHERE id = buyer_uuid;
    
    IF buyer_star_points < listing_record.price THEN
        RETURN FALSE;
    END IF;
    
    -- Check if buyer owns the player
    IF EXISTS (
        SELECT 1 FROM public.user_players 
        WHERE user_id = buyer_uuid 
        AND league_id = listing_record.league_id 
        AND player_id = listing_record.player_id
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Begin transaction
    BEGIN
        -- Deduct star points from buyer
        UPDATE public.users 
        SET star_points = star_points - listing_record.price 
        WHERE id = buyer_uuid;
        
        -- Add star points to seller
        UPDATE public.users 
        SET star_points = star_points + listing_record.price 
        WHERE id = listing_record.seller_id;
        
        -- Transfer player ownership
        INSERT INTO public.user_players (
            user_id, 
            league_id, 
            player_id, 
            purchase_price
        ) VALUES (
            buyer_uuid,
            listing_record.league_id,
            listing_record.player_id,
            listing_record.price
        );
        
        -- Remove player from seller's ownership
        DELETE FROM public.user_players 
        WHERE user_id = listing_record.seller_id 
        AND league_id = listing_record.league_id 
        AND player_id = listing_record.player_id;
        
        -- Update marketplace listing
        UPDATE public.player_marketplace 
        SET status = 'sold', 
            sold_at = NOW(), 
            buyer_id = buyer_uuid 
        WHERE id = marketplace_id;
        
        -- Record buyer transaction
        INSERT INTO public.star_point_transactions (
            user_id, 
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description,
            related_player_id,
            related_user_id
        ) VALUES (
            buyer_uuid,
            listing_record.league_id,
            'player_purchase',
            -listing_record.price,
            (SELECT star_points FROM public.users WHERE id = buyer_uuid),
            'Purchased player from marketplace',
            listing_record.player_id,
            listing_record.seller_id
        );
        
        -- Record seller transaction
        INSERT INTO public.star_point_transactions (
            user_id, 
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description,
            related_player_id,
            related_user_id
        ) VALUES (
            listing_record.seller_id,
            listing_record.league_id,
            'player_sale',
            listing_record.price,
            (SELECT star_points FROM public.users WHERE id = listing_record.seller_id),
            'Sold player on marketplace',
            listing_record.player_id,
            buyer_uuid
        );
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list a player for sale
CREATE OR REPLACE FUNCTION public.list_player_for_sale(
    user_uuid UUID,
    league_uuid UUID,
    player_uuid UUID,
    price INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user owns the player
    IF NOT EXISTS (
        SELECT 1 FROM public.user_players 
        WHERE user_id = user_uuid 
        AND league_id = league_uuid 
        AND player_id = player_uuid
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check if player is already listed
    IF EXISTS (
        SELECT 1 FROM public.player_marketplace 
        WHERE seller_id = user_uuid 
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
        player_id,
        price
    ) VALUES (
        league_uuid,
        user_uuid,
        player_uuid,
        price
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's available players for lineup
CREATE OR REPLACE FUNCTION public.get_user_available_players(
    user_uuid UUID,
    league_uuid UUID
)
RETURNS TABLE (
    player_id UUID,
    player_name TEXT,
    player_elo INTEGER,
    purchase_price INTEGER,
    purchase_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.player_id,
        cp.name,
        cp.elo,
        up.purchase_price,
        up.purchase_date
    FROM public.user_players up
    JOIN public.chess_players cp ON up.player_id = cp.id
    WHERE up.user_id = user_uuid 
    AND up.league_id = league_uuid
    AND up.is_available = true
    ORDER BY cp.elo DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Update the add_user_to_league function to award join bonus
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
    PERFORM public.award_join_bonus_star_points(user_uuid, league_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Create a function to populate initial player marketplace
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
        
        -- Create a "system" listing (no seller_id means it's available for initial purchase)
        INSERT INTO public.player_marketplace (
            league_id,
            player_id,
            price,
            seller_id
        ) VALUES (
            league_uuid,
            player_record.id,
            calculated_price,
            NULL
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Create a function to buy players from initial marketplace
CREATE OR REPLACE FUNCTION public.buy_from_initial_marketplace(
    user_uuid UUID,
    league_uuid UUID,
    player_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    listing_record RECORD;
    buyer_star_points INTEGER;
    calculated_price INTEGER;
BEGIN
    -- Get the initial marketplace listing
    SELECT * INTO listing_record 
    FROM public.player_marketplace 
    WHERE league_id = league_uuid 
    AND player_id = player_uuid 
    AND seller_id IS NULL 
    AND status = 'listed';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if buyer has enough star points
    SELECT star_points INTO buyer_star_points 
    FROM public.users WHERE id = user_uuid;
    
    IF buyer_star_points < listing_record.price THEN
        RETURN FALSE;
    END IF;
    
    -- Check if buyer already owns the player
    IF EXISTS (
        SELECT 1 FROM public.user_players 
        WHERE user_id = user_uuid 
        AND league_id = league_uuid 
        AND player_id = player_uuid
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Begin transaction
    BEGIN
        -- Deduct star points from buyer
        UPDATE public.users 
        SET star_points = star_points - listing_record.price 
        WHERE id = user_uuid;
        
        -- Add player to user's collection
        INSERT INTO public.user_players (
            user_id, 
            league_id, 
            player_id, 
            purchase_price
        ) VALUES (
            user_uuid,
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
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description,
            related_player_id
        ) VALUES (
            user_uuid,
            league_uuid,
            'player_purchase',
            -listing_record.price,
            (SELECT star_points FROM public.users WHERE id = user_uuid),
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

-- Step 16: Create a function to sell player back to system (at 70% of purchase price)
CREATE OR REPLACE FUNCTION public.sell_player_to_system(
    user_uuid UUID,
    league_uuid UUID,
    player_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    user_player_record RECORD;
    refund_amount INTEGER;
BEGIN
    -- Get user's player record
    SELECT * INTO user_player_record 
    FROM public.user_players 
    WHERE user_id = user_uuid 
    AND league_id = league_uuid 
    AND player_id = player_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate refund amount (70% of purchase price)
    refund_amount := FLOOR(user_player_record.purchase_price * 0.7);
    
    -- Begin transaction
    BEGIN
        -- Add star points to user
        UPDATE public.users 
        SET star_points = star_points + refund_amount 
        WHERE id = user_uuid;
        
        -- Remove player from user's collection
        DELETE FROM public.user_players 
        WHERE id = user_player_record.id;
        
        -- Record transaction
        INSERT INTO public.star_point_transactions (
            user_id, 
            league_id, 
            transaction_type, 
            amount, 
            balance_after,
            description,
            related_player_id
        ) VALUES (
            user_uuid,
            league_uuid,
            'player_sale',
            refund_amount,
            (SELECT star_points FROM public.users WHERE id = user_uuid),
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

-- Step 17: Create a function to get marketplace listings
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
        COALESCE(lm.display_name, 'System') as seller_name,
        pm.listed_at
    FROM public.player_marketplace pm
    JOIN public.chess_players cp ON pm.player_id = cp.id
    LEFT JOIN public.league_members lm ON pm.seller_id = lm.user_id AND lm.league_id = league_uuid
    WHERE pm.league_id = league_uuid 
    AND pm.status = 'listed'
    ORDER BY pm.listed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 18: Create a function to get user's star points history
CREATE OR REPLACE FUNCTION public.get_user_star_points_history(
    user_uuid UUID,
    league_uuid UUID
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
    WHERE spt.user_id = user_uuid 
    AND spt.league_id = league_uuid
    ORDER BY spt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 19: Create a function to get league star points leaderboard
CREATE OR REPLACE FUNCTION public.get_star_points_leaderboard(league_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    star_points INTEGER,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        lm.display_name,
        u.star_points,
        ROW_NUMBER() OVER (ORDER BY u.star_points DESC) as rank
    FROM public.users u
    JOIN public.league_members lm ON u.id = lm.user_id AND lm.league_id = league_uuid
    ORDER BY u.star_points DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 20: Create a scheduled function to award weekly star points
-- This can be called via cron job or manually
-- Example: SELECT public.award_weekly_star_points();

-- Step 21: Add some sample data for testing
-- Insert some initial marketplace listings for existing leagues
DO $$
DECLARE
    league_record RECORD;
BEGIN
    FOR league_record IN SELECT * FROM public.leagues LOOP
        PERFORM public.populate_initial_marketplace(league_record.id);
    END LOOP;
END $$; 