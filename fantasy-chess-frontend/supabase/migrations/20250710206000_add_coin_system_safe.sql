-- Fantasy Chess Coin System Migration (Safe Version)
-- This migration safely creates the coin system by checking for existing tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add coin balance to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'coin_balance') THEN
        ALTER TABLE users ADD COLUMN coin_balance INTEGER NOT NULL DEFAULT 50;
    END IF;
END $$;

-- 2. Create coin transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('weekly_award', 'player_purchase', 'player_sale', 'trade_buy', 'trade_sell', 'bonus')),
    amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create player marketplace table if it doesn't exist
CREATE TABLE IF NOT EXISTS player_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_username TEXT NOT NULL,
    player_elo INTEGER NOT NULL,
    price INTEGER NOT NULL CHECK (price > 0),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seller_bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    is_bot_seller BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_at TIMESTAMP WITH TIME ZONE,
    buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    buyer_bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    is_bot_buyer BOOLEAN NOT NULL DEFAULT false
);

-- 4. Create user players table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    player_username TEXT NOT NULL,
    player_elo INTEGER NOT NULL,
    purchase_price INTEGER NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_bot_owner BOOLEAN NOT NULL DEFAULT false
);

-- 5. Create trade offers table if it doesn't exist
CREATE TABLE IF NOT EXISTS trade_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offerer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    offerer_bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    is_offerer_bot BOOLEAN NOT NULL DEFAULT false,
    offeree_id UUID REFERENCES users(id) ON DELETE CASCADE,
    offeree_bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    is_offeree_bot BOOLEAN NOT NULL DEFAULT false,
    offered_player_username TEXT,
    offered_coins INTEGER DEFAULT 0,
    requested_player_username TEXT,
    requested_coins INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- 6. Ensure required columns exist before creating indexes (safe for existing data)
DO $$
BEGIN
    -- player_marketplace.created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    -- coin_transactions.created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'coin_transactions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE coin_transactions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    -- user_players.purchased_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'user_players' AND column_name = 'purchased_at'
    ) THEN
        ALTER TABLE user_players ADD COLUMN purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    -- user_players.player_username (add as nullable first, then update)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'user_players' AND column_name = 'player_username'
    ) THEN
        ALTER TABLE user_players ADD COLUMN player_username TEXT;
        UPDATE user_players SET player_username = 'Unknown Player' WHERE player_username IS NULL;
        ALTER TABLE user_players ALTER COLUMN player_username SET NOT NULL;
    END IF;
    -- user_players.bot_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'user_players' AND column_name = 'bot_id'
    ) THEN
        ALTER TABLE user_players ADD COLUMN bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
    END IF;
    -- user_players.user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'user_players' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE user_players ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    -- user_players.player_elo (add as nullable first, then update)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'user_players' AND column_name = 'player_elo'
    ) THEN
        ALTER TABLE user_players ADD COLUMN player_elo INTEGER;
        UPDATE user_players SET player_elo = 1200 WHERE player_elo IS NULL;
        ALTER TABLE user_players ALTER COLUMN player_elo SET NOT NULL;
    END IF;
    -- user_players.purchase_price (add as nullable first, then update)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'user_players' AND column_name = 'purchase_price'
    ) THEN
        ALTER TABLE user_players ADD COLUMN purchase_price INTEGER;
        UPDATE user_players SET purchase_price = 5 WHERE purchase_price IS NULL;
        ALTER TABLE user_players ALTER COLUMN purchase_price SET NOT NULL;
    END IF;
    -- user_players.is_bot_owner
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'user_players' AND column_name = 'is_bot_owner'
    ) THEN
        ALTER TABLE user_players ADD COLUMN is_bot_owner BOOLEAN NOT NULL DEFAULT false;
    END IF;
    -- player_marketplace.seller_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN seller_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    -- player_marketplace.seller_bot_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'seller_bot_id'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN seller_bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
    END IF;
    -- player_marketplace.player_username (add as nullable first, then update)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'player_username'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN player_username TEXT;
        UPDATE player_marketplace SET player_username = 'Unknown Player' WHERE player_username IS NULL;
        ALTER TABLE player_marketplace ALTER COLUMN player_username SET NOT NULL;
    END IF;
    -- player_marketplace.player_elo (add as nullable first, then update)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'player_elo'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN player_elo INTEGER;
        UPDATE player_marketplace SET player_elo = 1200 WHERE player_elo IS NULL;
        ALTER TABLE player_marketplace ALTER COLUMN player_elo SET NOT NULL;
    END IF;
    -- player_marketplace.price (add as nullable first, then update)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'price'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN price INTEGER;
        UPDATE player_marketplace SET price = 5 WHERE price IS NULL;
        ALTER TABLE player_marketplace ALTER COLUMN price SET NOT NULL;
        ALTER TABLE player_marketplace ADD CONSTRAINT check_price_positive CHECK (price > 0);
    END IF;
    -- player_marketplace.is_bot_seller
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'is_bot_seller'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN is_bot_seller BOOLEAN NOT NULL DEFAULT false;
    END IF;
    -- player_marketplace.sold_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'sold_at'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN sold_at TIMESTAMP WITH TIME ZONE;
    END IF;
    -- player_marketplace.buyer_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'buyer_id'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN buyer_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    -- player_marketplace.buyer_bot_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'buyer_bot_id'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN buyer_bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
    END IF;
    -- player_marketplace.is_bot_buyer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'player_marketplace' AND column_name = 'is_bot_buyer'
    ) THEN
        ALTER TABLE player_marketplace ADD COLUMN is_bot_buyer BOOLEAN NOT NULL DEFAULT false;
    END IF;
    -- trade_offers.created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    -- trade_offers.responded_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'responded_at'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE;
    END IF;
    -- trade_offers.offerer_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'offerer_id'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN offerer_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    -- trade_offers.offeree_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'offeree_id'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN offeree_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    -- trade_offers.status (add as nullable first, then update)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'status'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN status TEXT;
        UPDATE trade_offers SET status = 'pending' WHERE status IS NULL;
        ALTER TABLE trade_offers ALTER COLUMN status SET NOT NULL;
        ALTER TABLE trade_offers ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));
    END IF;
    -- trade_offers.offerer_bot_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'offerer_bot_id'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN offerer_bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
    END IF;
    -- trade_offers.offeree_bot_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'offeree_bot_id'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN offeree_bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
    END IF;
    -- trade_offers.is_offerer_bot
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'is_offerer_bot'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN is_offerer_bot BOOLEAN NOT NULL DEFAULT false;
    END IF;
    -- trade_offers.is_offeree_bot
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'is_offeree_bot'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN is_offeree_bot BOOLEAN NOT NULL DEFAULT false;
    END IF;
    -- trade_offers.offered_player_username
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'offered_player_username'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN offered_player_username TEXT;
    END IF;
    -- trade_offers.offered_coins
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'offered_coins'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN offered_coins INTEGER DEFAULT 0;
    END IF;
    -- trade_offers.requested_player_username
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'requested_player_username'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN requested_player_username TEXT;
    END IF;
    -- trade_offers.requested_coins
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_offers' AND column_name = 'requested_coins'
    ) THEN
        ALTER TABLE trade_offers ADD COLUMN requested_coins INTEGER DEFAULT 0;
    END IF;
    -- coin_transactions.user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'coin_transactions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE coin_transactions ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    -- coin_transactions.bot_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'coin_transactions' AND column_name = 'bot_id'
    ) THEN
        ALTER TABLE coin_transactions ADD COLUMN bot_id UUID REFERENCES bots(id) ON DELETE CASCADE;
    END IF;
    -- coin_transactions.transaction_type (add as nullable first, then update)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'coin_transactions' AND column_name = 'transaction_type'
    ) THEN
        ALTER TABLE coin_transactions ADD COLUMN transaction_type TEXT;
        UPDATE coin_transactions SET transaction_type = 'bonus' WHERE transaction_type IS NULL;
        ALTER TABLE coin_transactions ALTER COLUMN transaction_type SET NOT NULL;
        ALTER TABLE coin_transactions ADD CONSTRAINT check_transaction_type_valid CHECK (transaction_type IN ('weekly_award', 'player_purchase', 'player_sale', 'trade_buy', 'trade_sell', 'bonus'));
    END IF;
    -- coin_transactions.amount (add as nullable first, then update)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'coin_transactions' AND column_name = 'amount'
    ) THEN
        ALTER TABLE coin_transactions ADD COLUMN amount INTEGER;
        UPDATE coin_transactions SET amount = 0 WHERE amount IS NULL;
        ALTER TABLE coin_transactions ALTER COLUMN amount SET NOT NULL;
    END IF;
    -- coin_transactions.description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'coin_transactions' AND column_name = 'description'
    ) THEN
        ALTER TABLE coin_transactions ADD COLUMN description TEXT;
    END IF;
END $$;

-- 7. Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_coin_transactions_user_id') THEN
        CREATE INDEX idx_coin_transactions_user_id ON coin_transactions(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_coin_transactions_bot_id') THEN
        CREATE INDEX idx_coin_transactions_bot_id ON coin_transactions(bot_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_coin_transactions_created_at') THEN
        CREATE INDEX idx_coin_transactions_created_at ON coin_transactions(created_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_player_marketplace_seller_id') THEN
        CREATE INDEX idx_player_marketplace_seller_id ON player_marketplace(seller_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_player_marketplace_seller_bot_id') THEN
        CREATE INDEX idx_player_marketplace_seller_bot_id ON player_marketplace(seller_bot_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_player_marketplace_created_at') THEN
        CREATE INDEX idx_player_marketplace_created_at ON player_marketplace(created_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_players_user_id') THEN
        CREATE INDEX idx_user_players_user_id ON user_players(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_players_bot_id') THEN
        CREATE INDEX idx_user_players_bot_id ON user_players(bot_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_players_username') THEN
        CREATE INDEX idx_user_players_username ON user_players(player_username);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trade_offers_offerer_id') THEN
        CREATE INDEX idx_trade_offers_offerer_id ON trade_offers(offerer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trade_offers_offeree_id') THEN
        CREATE INDEX idx_trade_offers_offeree_id ON trade_offers(offeree_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trade_offers_status') THEN
        CREATE INDEX idx_trade_offers_status ON trade_offers(status);
    END IF;
END $$;

-- 8. Drop existing functions to avoid parameter conflicts
DROP FUNCTION IF EXISTS award_weekly_coins() CASCADE;
DROP FUNCTION IF EXISTS calculate_player_price(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS buy_player_from_marketplace(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS buy_player_from_marketplace(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS buy_player_from_marketplace(UUID) CASCADE;
DROP FUNCTION IF EXISTS list_player_on_marketplace(TEXT, INTEGER, INTEGER, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS list_player_on_marketplace(TEXT, INTEGER, INTEGER, UUID) CASCADE;
DROP FUNCTION IF EXISTS list_player_on_marketplace(TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS bot_ai_buy_players() CASCADE;

-- 9. Create or replace functions
CREATE OR REPLACE FUNCTION award_weekly_coins()
RETURNS void AS $$
BEGIN
    -- Award 50 coins to all users
    UPDATE users 
    SET coin_balance = coin_balance + 50;
    
    -- Record transactions for users
    INSERT INTO coin_transactions (user_id, transaction_type, amount, description)
    SELECT id, 'weekly_award', 50, 'Weekly coin award'
    FROM users;
    
    -- Award 50 coins to all bots
    UPDATE bots 
    SET coin_balance = coin_balance + 50;
    
    -- Record transactions for bots
    INSERT INTO coin_transactions (bot_id, transaction_type, amount, description)
    SELECT id, 'weekly_award', 50, 'Weekly coin award'
    FROM bots;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_player_price(player_elo INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE 
        WHEN player_elo >= 3000 THEN 50  -- World Champion level
        WHEN player_elo >= 2800 THEN 45  -- Super GM level
        WHEN player_elo >= 2600 THEN 40  -- GM level
        WHEN player_elo >= 2400 THEN 35  -- IM level
        WHEN player_elo >= 2200 THEN 30  -- FM level
        WHEN player_elo >= 2000 THEN 25  -- Expert level
        WHEN player_elo >= 1800 THEN 20  -- Class A
        WHEN player_elo >= 1600 THEN 15  -- Class B
        WHEN player_elo >= 1400 THEN 10  -- Class C
        ELSE 5  -- Beginner
    END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION buy_player_from_marketplace(
    p_marketplace_id UUID,
    p_buyer_id UUID DEFAULT NULL,
    p_buyer_bot_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_marketplace_record player_marketplace%ROWTYPE;
    v_buyer_coin_balance INTEGER;
    v_player_price INTEGER;
    v_sale_price INTEGER;
BEGIN
    -- Get marketplace record
    SELECT * INTO v_marketplace_record
    FROM player_marketplace
    WHERE id = p_marketplace_id AND sold_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Determine buyer and check balance
    IF p_buyer_id IS NOT NULL THEN
        SELECT coin_balance INTO v_buyer_coin_balance
        FROM users WHERE id = p_buyer_id;
    ELSIF p_buyer_bot_id IS NOT NULL THEN
        SELECT coin_balance INTO v_buyer_coin_balance
        FROM bots WHERE id = p_buyer_bot_id;
    ELSE
        RETURN FALSE;
    END IF;
    
    IF v_buyer_coin_balance < v_marketplace_record.price THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate sale price (80% of purchase price)
    v_sale_price := ROUND(v_marketplace_record.price * 0.8);
    
    -- Transfer coins
    IF p_buyer_id IS NOT NULL THEN
        UPDATE users SET coin_balance = coin_balance - v_marketplace_record.price WHERE id = p_buyer_id;
    ELSE
        UPDATE bots SET coin_balance = coin_balance - v_marketplace_record.price WHERE id = p_buyer_bot_id;
    END IF;
    
    IF v_marketplace_record.is_bot_seller THEN
        UPDATE bots SET coin_balance = coin_balance + v_sale_price WHERE id = v_marketplace_record.seller_bot_id;
    ELSE
        UPDATE users SET coin_balance = coin_balance + v_sale_price WHERE id = v_marketplace_record.seller_id;
    END IF;
    
    -- Record transactions
    INSERT INTO coin_transactions (user_id, bot_id, transaction_type, amount, description)
    VALUES (
        CASE WHEN p_buyer_id IS NOT NULL THEN p_buyer_id ELSE NULL END,
        CASE WHEN p_buyer_bot_id IS NOT NULL THEN p_buyer_bot_id ELSE NULL END,
        'player_purchase',
        -v_marketplace_record.price,
        'Purchased ' || v_marketplace_record.player_username
    );
    
    INSERT INTO coin_transactions (user_id, bot_id, transaction_type, amount, description)
    VALUES (
        CASE WHEN v_marketplace_record.is_bot_seller THEN NULL ELSE v_marketplace_record.seller_id END,
        CASE WHEN v_marketplace_record.is_bot_seller THEN v_marketplace_record.seller_bot_id ELSE NULL END,
        'player_sale',
        v_sale_price,
        'Sold ' || v_marketplace_record.player_username
    );
    
    -- Transfer player ownership
    INSERT INTO user_players (user_id, bot_id, player_username, player_elo, purchase_price, is_bot_owner)
    VALUES (
        CASE WHEN p_buyer_id IS NOT NULL THEN p_buyer_id ELSE NULL END,
        CASE WHEN p_buyer_bot_id IS NOT NULL THEN p_buyer_bot_id ELSE NULL END,
        v_marketplace_record.player_username,
        v_marketplace_record.player_elo,
        v_marketplace_record.price,
        CASE WHEN p_buyer_bot_id IS NOT NULL THEN TRUE ELSE FALSE END
    );
    
    -- Mark marketplace listing as sold
    UPDATE player_marketplace 
    SET sold_at = NOW(),
        buyer_id = p_buyer_id,
        buyer_bot_id = p_buyer_bot_id,
        is_bot_buyer = CASE WHEN p_buyer_bot_id IS NOT NULL THEN TRUE ELSE FALSE END
    WHERE id = p_marketplace_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION list_player_on_marketplace(
    p_player_username TEXT,
    p_player_elo INTEGER,
    p_price INTEGER,
    p_seller_id UUID DEFAULT NULL,
    p_seller_bot_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_player_record user_players%ROWTYPE;
BEGIN
    -- Find the player in user_players
    SELECT * INTO v_player_record
    FROM user_players
    WHERE player_username = p_player_username
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
        is_bot_seller
    ) VALUES (
        p_player_username,
        p_player_elo,
        p_price,
        p_seller_id,
        p_seller_bot_id,
        CASE WHEN p_seller_bot_id IS NOT NULL THEN TRUE ELSE FALSE END
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION bot_ai_buy_players()
RETURNS void AS $$
DECLARE
    v_bot_record bots%ROWTYPE;
    v_marketplace_record player_marketplace%ROWTYPE;
    v_bot_coin_balance INTEGER;
    v_player_price INTEGER;
    v_affordable_players INTEGER;
BEGIN
    FOR v_bot_record IN SELECT * FROM bots WHERE coin_balance > 0 LOOP
        v_bot_coin_balance := v_bot_record.coin_balance;
        
        -- Count how many affordable players the bot can buy
        SELECT COUNT(*) INTO v_affordable_players
        FROM player_marketplace
        WHERE sold_at IS NULL 
        AND seller_bot_id IS DISTINCT FROM v_bot_record.id
        AND price <= v_bot_coin_balance;
        
        -- Bot buys 1-3 players if it has enough coins and there are affordable players
        IF v_affordable_players > 0 AND v_bot_coin_balance >= 10 THEN
            FOR i IN 1..LEAST(3, v_affordable_players) LOOP
                -- Find a random affordable player
                SELECT * INTO v_marketplace_record
                FROM player_marketplace
                WHERE sold_at IS NULL 
                AND seller_bot_id IS DISTINCT FROM v_bot_record.id
                AND price <= v_bot_coin_balance
                ORDER BY RANDOM()
                LIMIT 1;
                
                IF FOUND THEN
                    -- Try to buy the player
                    PERFORM buy_player_from_marketplace(v_marketplace_record.id, NULL, v_bot_record.id);
                    
                    -- Update bot's coin balance for next iteration
                    SELECT coin_balance INTO v_bot_coin_balance
                    FROM bots WHERE id = v_bot_record.id;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 10. Add RLS policies (only if they don't exist)
DO $$
BEGIN
    -- Enable RLS on tables
    ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE player_marketplace ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_players ENABLE ROW LEVEL SECURITY;
    ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;
    
    -- Add policies only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coin_transactions' AND policyname = 'Users can view their own coin transactions') THEN
        CREATE POLICY "Users can view their own coin transactions" ON coin_transactions
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coin_transactions' AND policyname = 'Users can view bot coin transactions') THEN
        CREATE POLICY "Users can view bot coin transactions" ON coin_transactions
            FOR SELECT USING (bot_id IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_marketplace' AND policyname = 'Anyone can view marketplace listings') THEN
        CREATE POLICY "Anyone can view marketplace listings" ON player_marketplace
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_marketplace' AND policyname = 'Users can create marketplace listings') THEN
        CREATE POLICY "Users can create marketplace listings" ON player_marketplace
            FOR INSERT WITH CHECK (auth.uid() = seller_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_marketplace' AND policyname = 'Users can update their own marketplace listings') THEN
        CREATE POLICY "Users can update their own marketplace listings" ON player_marketplace
            FOR UPDATE USING (auth.uid() = seller_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_players' AND policyname = 'Users can view their own players') THEN
        CREATE POLICY "Users can view their own players" ON user_players
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_players' AND policyname = 'Users can view bot players') THEN
        CREATE POLICY "Users can view bot players" ON user_players
            FOR SELECT USING (bot_id IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_players' AND policyname = 'Users can insert their own players') THEN
        CREATE POLICY "Users can insert their own players" ON user_players
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_players' AND policyname = 'Users can delete their own players') THEN
        CREATE POLICY "Users can delete their own players" ON user_players
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_offers' AND policyname = 'Users can view trade offers they''re involved in') THEN
        CREATE POLICY "Users can view trade offers they're involved in" ON trade_offers
            FOR SELECT USING (auth.uid() = offerer_id OR auth.uid() = offeree_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_offers' AND policyname = 'Users can create trade offers') THEN
        CREATE POLICY "Users can create trade offers" ON trade_offers
            FOR INSERT WITH CHECK (auth.uid() = offerer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_offers' AND policyname = 'Users can update trade offers they''re involved in') THEN
        CREATE POLICY "Users can update trade offers they're involved in" ON trade_offers
            FOR UPDATE USING (auth.uid() = offerer_id OR auth.uid() = offeree_id);
    END IF;
END $$;

-- 11. Add coin_balance to bots table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bots' AND column_name = 'coin_balance') THEN
        ALTER TABLE bots ADD COLUMN coin_balance INTEGER NOT NULL DEFAULT 50;
    END IF;
END $$; 