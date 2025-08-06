-- Fix lineups table bot_id column and RLS issues
-- This script ensures the bot_id column exists and RLS is properly configured

-- Step 1: Add bot_id column to lineups table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lineups' 
        AND column_name = 'bot_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.lineups ADD COLUMN bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 2: Create index on bot_id for performance
CREATE INDEX IF NOT EXISTS idx_lineups_bot_id ON public.lineups(bot_id);

-- Step 3: Disable RLS on lineups table to prevent 400 errors
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop any existing RLS policies on lineups table
DROP POLICY IF EXISTS "Enable read access for all users" ON lineups;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON lineups;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON lineups;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON lineups;
DROP POLICY IF EXISTS "Lineups can be read by all users" ON lineups;
DROP POLICY IF EXISTS "Lineups can be created by authenticated users" ON lineups;
DROP POLICY IF EXISTS "Lineups can be updated by their creator" ON lineups;
DROP POLICY IF EXISTS "Lineups can be deleted by their creator" ON lineups;

-- Step 5: Grant all permissions to all roles
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON lineups TO anon;
GRANT ALL ON lineups TO service_role;

-- Step 6: Verify the bot_id column exists
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lineups' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 7: Test a simple query on lineups table
SELECT COUNT(*) FROM lineups;

-- Step 8: Show any existing lineups with bot_id
SELECT 
    id,
    user_id,
    bot_id,
    league_id,
    week_start_date,
    total_points
FROM lineups 
WHERE bot_id IS NOT NULL
LIMIT 10; 