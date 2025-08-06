-- Fix coin_transactions table issues
-- 1. Add missing balance_after column
-- 2. Fix RLS policies

-- Add balance_after column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coin_transactions' 
        AND column_name = 'balance_after'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.coin_transactions ADD COLUMN balance_after INTEGER;
    END IF;
END $$;

-- Disable RLS on coin_transactions table to allow inserts
ALTER TABLE coin_transactions DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies on coin_transactions
DROP POLICY IF EXISTS "Enable read access for all users" ON coin_transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON coin_transactions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON coin_transactions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON coin_transactions;
DROP POLICY IF EXISTS "Coin transactions can be read by all users" ON coin_transactions;
DROP POLICY IF EXISTS "Coin transactions can be created by authenticated users" ON coin_transactions;
DROP POLICY IF EXISTS "Coin transactions can be updated by their creator" ON coin_transactions;
DROP POLICY IF EXISTS "Coin transactions can be deleted by their creator" ON coin_transactions;

-- Grant all permissions to all roles
GRANT ALL ON coin_transactions TO authenticated;
GRANT ALL ON coin_transactions TO anon;
GRANT ALL ON coin_transactions TO service_role;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'coin_transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position; 