-- Add League-Specific Coin System
-- This migration makes coins and players league-specific

-- Step 1: Create league_coin_balances table for league-specific coin balances
CREATE TABLE IF NOT EXISTS league_coin_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    coin_balance INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, league_id),
    UNIQUE(bot_id, league_id)
);

-- Step 2: Add league_id column to user_players table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_players' AND column_name = 'league_id'
    ) THEN
        ALTER TABLE user_players ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Add league_id column to coin_transactions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coin_transactions' AND column_name = 'league_id'
    ) THEN
        ALTER TABLE coin_transactions ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Add league_id column to player_marketplace table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'player_marketplace' AND column_name = 'league_id'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 5: Create function to initialize league coin balance for new users/bots
CREATE OR REPLACE FUNCTION initialize_league_coin_balance(
    p_user_id UUID DEFAULT NULL,
    p_bot_id UUID DEFAULT NULL,
    p_league_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if balance already exists
    IF EXISTS (
        SELECT 1 FROM league_coin_balances 
        WHERE (user_id = p_user_id OR bot_id = p_bot_id) AND league_id = p_league_id
    ) THEN
        RETURN TRUE; -- Already initialized
    END IF;

    -- Insert new balance
    INSERT INTO league_coin_balances (user_id, bot_id, league_id, coin_balance)
    VALUES (p_user_id, p_bot_id, p_league_id, 50);

    -- Record transaction
    INSERT INTO coin_transactions (
        user_id, bot_id, league_id, transaction_type, amount, balance_after, description
    ) VALUES (
        p_user_id, p_bot_id, p_league_id, 'join_bonus', 50, 50, 'Initial coin balance for joining league'
    );

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update buy_player_from_marketplace function to be league-specific
CREATE OR REPLACE FUNCTION buy_player_from_marketplace(
    p_marketplace_id UUID,
    p_buyer_id UUID DEFAULT NULL,
    p_buyer_bot_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    listing_record RECORD;
    buyer_coin_balance INTEGER;
    league_uuid UUID;
BEGIN
    -- Get marketplace listing
    SELECT * INTO listing_record
    FROM player_marketplace
    WHERE id = p_marketplace_id AND sold_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    league_uuid := listing_record.league_id;

    -- Get buyer's coin balance for this league
    SELECT coin_balance INTO buyer_coin_balance
    FROM league_coin_balances
    WHERE (user_id = p_buyer_id OR bot_id = p_buyer_bot_id) AND league_id = league_uuid;
    
    IF NOT FOUND THEN
        -- Initialize balance if it doesn't exist
        IF NOT initialize_league_coin_balance(p_buyer_id, p_buyer_bot_id, league_uuid) THEN
            RETURN FALSE;
        END IF;
        buyer_coin_balance := 50;
    END IF;

    -- Check if buyer has enough coins
    IF buyer_coin_balance < listing_record.price THEN
        RETURN FALSE;
    END IF;

    -- Begin transaction
    BEGIN
        -- Deduct coins from buyer
        UPDATE league_coin_balances 
        SET coin_balance = coin_balance - listing_record.price,
            updated_at = NOW()
        WHERE (user_id = p_buyer_id OR bot_id = p_buyer_bot_id) AND league_id = league_uuid;
        
        -- Add coins to seller
        IF listing_record.seller_id IS NOT NULL THEN
            UPDATE league_coin_balances 
            SET coin_balance = coin_balance + listing_record.price,
                updated_at = NOW()
            WHERE user_id = listing_record.seller_id AND league_id = league_uuid;
        ELSIF listing_record.seller_bot_id IS NOT NULL THEN
            UPDATE league_coin_balances 
            SET coin_balance = coin_balance + listing_record.price,
                updated_at = NOW()
            WHERE bot_id = listing_record.seller_bot_id AND league_id = league_uuid;
        END IF;
        
        -- Transfer player ownership
        INSERT INTO user_players (
            user_id,
            bot_id,
            league_id,
            player_username,
            player_elo,
            purchase_price
        ) VALUES (
            p_buyer_id,
            p_buyer_bot_id,
            league_uuid,
            listing_record.player_username,
            listing_record.player_elo,
            listing_record.price
        );
        
        -- Remove from seller's ownership
        DELETE FROM user_players 
        WHERE (user_id = listing_record.seller_id OR bot_id = listing_record.seller_bot_id)
        AND league_id = league_uuid 
        AND player_username = listing_record.player_username;
        
        -- Mark marketplace listing as sold
        UPDATE player_marketplace 
        SET sold_at = NOW(),
            buyer_id = p_buyer_id,
            buyer_bot_id = p_buyer_bot_id
        WHERE id = p_marketplace_id;
        
        -- Record buyer transaction
        INSERT INTO coin_transactions (
            user_id, bot_id, league_id, transaction_type, amount, balance_after, description
        ) VALUES (
            p_buyer_id, p_buyer_bot_id, league_uuid, 'player_purchase', -listing_record.price,
            (SELECT coin_balance FROM league_coin_balances WHERE (user_id = p_buyer_id OR bot_id = p_buyer_bot_id) AND league_id = league_uuid),
            'Purchased ' || listing_record.player_username
        );
        
        -- Record seller transaction
        IF listing_record.seller_id IS NOT NULL THEN
            INSERT INTO coin_transactions (
                user_id, bot_id, league_id, transaction_type, amount, balance_after, description
            ) VALUES (
                listing_record.seller_id, NULL, league_uuid, 'player_sale', listing_record.price,
                (SELECT coin_balance FROM league_coin_balances WHERE user_id = listing_record.seller_id AND league_id = league_uuid),
                'Sold ' || listing_record.player_username
            );
        ELSIF listing_record.seller_bot_id IS NOT NULL THEN
            INSERT INTO coin_transactions (
                user_id, bot_id, league_id, transaction_type, amount, balance_after, description
            ) VALUES (
                NULL, listing_record.seller_bot_id, league_uuid, 'player_sale', listing_record.price,
                (SELECT coin_balance FROM league_coin_balances WHERE bot_id = listing_record.seller_bot_id AND league_id = league_uuid),
                'Sold ' || listing_record.player_username
            );
        END IF;
        
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Update list_player_on_marketplace function to be league-specific
CREATE OR REPLACE FUNCTION list_player_on_marketplace(
    p_player_username TEXT DEFAULT '',
    p_player_elo INTEGER DEFAULT 0,
    p_price INTEGER DEFAULT 0,
    p_seller_id UUID DEFAULT NULL,
    p_seller_bot_id UUID DEFAULT NULL,
    p_league_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_player_record RECORD;
BEGIN
    -- Find the player in user_players
    SELECT * INTO v_player_record
    FROM user_players
    WHERE player_username = p_player_username
    AND league_id = p_league_id
    AND (
        (p_seller_id IS NOT NULL AND user_id = p_seller_id AND bot_id IS NULL) OR
        (p_seller_bot_id IS NOT NULL AND bot_id = p_seller_bot_id AND user_id IS NULL)
    )
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Remove from user_players
    DELETE FROM user_players WHERE id = v_player_record.id;
    
    -- Add to marketplace
    INSERT INTO player_marketplace (
        player_username, 
        player_elo, 
        price, 
        seller_id, 
        seller_bot_id, 
        is_bot_seller,
        league_id
    ) VALUES (
        p_player_username,
        p_player_elo,
        p_price,
        p_seller_id,
        p_seller_bot_id,
        CASE WHEN p_seller_bot_id IS NOT NULL THEN TRUE ELSE FALSE END,
        p_league_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to migrate old league players to user_players
CREATE OR REPLACE FUNCTION migrate_old_league_players()
RETURNS void AS $$
DECLARE
    team_record RECORD;
    player_id UUID;
    player_name TEXT;
    player_elo INTEGER;
BEGIN
    -- Loop through all teams
    FOR team_record IN 
        SELECT t.id, t.user_id, t.league_id, t.player_ids, l.name as league_name
        FROM teams t
        JOIN leagues l ON t.league_id = l.id
        WHERE t.player_ids IS NOT NULL AND array_length(t.player_ids, 1) > 0
    LOOP
        -- Loop through each player in the team
        FOREACH player_id IN ARRAY team_record.player_ids
        LOOP
            -- Get player details
            SELECT name, elo INTO player_name, player_elo
            FROM chess_players
            WHERE id = player_id;
            
            IF FOUND THEN
                -- Check if player already exists in user_players for this league
                IF NOT EXISTS (
                    SELECT 1 FROM user_players 
                    WHERE user_id = team_record.user_id 
                    AND league_id = team_record.league_id 
                    AND player_username = player_name
                ) THEN
                    -- Insert player into user_players
                    INSERT INTO user_players (
                        user_id,
                        bot_id,
                        league_id,
                        player_username,
                        player_elo,
                        purchase_price,
                        purchased_at
                    ) VALUES (
                        team_record.user_id,
                        NULL,
                        team_record.league_id,
                        player_name,
                        player_elo,
                        0, -- These were drafted, not purchased
                        NOW()
                    );
                    
                    RAISE NOTICE 'Migrated player % for user % in league %', 
                        player_name, team_record.user_id, team_record.league_name;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create function to distribute weekly coins to all league members
CREATE OR REPLACE FUNCTION distribute_weekly_league_coins(p_league_id UUID)
RETURNS void AS $$
DECLARE
    member_record RECORD;
BEGIN
    -- Get all league members (users and bots)
    FOR member_record IN 
        SELECT user_id, bot_id FROM league_coin_balances WHERE league_id = p_league_id
    LOOP
        -- Add 50 coins to each member
        UPDATE league_coin_balances 
        SET coin_balance = coin_balance + 50,
            updated_at = NOW()
        WHERE league_id = p_league_id 
        AND (user_id = member_record.user_id OR bot_id = member_record.bot_id);
        
        -- Record transaction
        INSERT INTO coin_transactions (
            user_id, bot_id, league_id, transaction_type, amount, balance_after, description
        ) VALUES (
            member_record.user_id, member_record.bot_id, p_league_id, 'weekly_award', 50,
            (SELECT coin_balance FROM league_coin_balances 
             WHERE league_id = p_league_id 
             AND (user_id = member_record.user_id OR bot_id = member_record.bot_id)),
            'Weekly coin distribution'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create RLS policies for league_coin_balances
ALTER TABLE league_coin_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own league coin balances" ON league_coin_balances
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM bots b WHERE b.id = bot_id)
    );

CREATE POLICY "Users can update their own league coin balances" ON league_coin_balances
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM bots b WHERE b.id = bot_id)
    );

-- Step 11: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_league_coin_balances_user_league ON league_coin_balances(user_id, league_id);
CREATE INDEX IF NOT EXISTS idx_league_coin_balances_bot_league ON league_coin_balances(bot_id, league_id);
CREATE INDEX IF NOT EXISTS idx_user_players_league ON user_players(league_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_league ON coin_transactions(league_id);
CREATE INDEX IF NOT EXISTS idx_player_marketplace_league ON player_marketplace(league_id);


