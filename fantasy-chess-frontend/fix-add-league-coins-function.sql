-- Fix: Add missing add_league_coins function and related coin system
-- This fixes the "Could not find the function public.add_league_coins" error
-- Run this manually in your Supabase SQL editor

-- Step 1: Ensure league_coin_balances table exists
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

-- Step 2: Create add_league_coins function
CREATE OR REPLACE FUNCTION add_league_coins(p_user_id UUID, p_league_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.league_coin_balances
  SET coin_balance = coin_balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id AND league_id = p_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create deduct_league_coins function
CREATE OR REPLACE FUNCTION deduct_league_coins(p_user_id UUID, p_league_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.league_coin_balances
  SET coin_balance = coin_balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id AND league_id = p_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create initialize_league_coin_balance function
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

-- Step 5: Ensure coin_transactions table exists
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('join_bonus', 'weekly_award', 'player_purchase', 'player_sale', 'trade', 'refund')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Grant execute permissions
GRANT EXECUTE ON FUNCTION add_league_coins(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_league_coins(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_league_coin_balance(UUID, UUID, UUID) TO authenticated;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_league_coin_balances_user_league ON league_coin_balances(user_id, league_id);
CREATE INDEX IF NOT EXISTS idx_league_coin_balances_bot_league ON league_coin_balances(bot_id, league_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_league ON coin_transactions(user_id, league_id);

-- Step 8: Set up RLS policies for league_coin_balances
ALTER TABLE league_coin_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own league coin balances" ON league_coin_balances;
CREATE POLICY "Users can view their own league coin balances" ON league_coin_balances
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM bots b WHERE b.id = bot_id)
    );

DROP POLICY IF EXISTS "Users can update their own league coin balances" ON league_coin_balances;
CREATE POLICY "Users can update their own league coin balances" ON league_coin_balances
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM bots b WHERE b.id = bot_id)
    );

-- Step 9: Verify the functions exist
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('add_league_coins', 'deduct_league_coins', 'initialize_league_coin_balance')
AND routine_schema = 'public';

-- Step 10: Show sample data to verify tables exist
SELECT 
  COUNT(*) as league_coin_balances_count
FROM league_coin_balances;

SELECT 
  COUNT(*) as coin_transactions_count
FROM coin_transactions; 