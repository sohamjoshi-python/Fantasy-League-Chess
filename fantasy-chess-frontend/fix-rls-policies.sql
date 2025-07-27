-- Fix RLS policies for tables causing 406 errors

-- 1. Fix lineups table RLS
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own lineups" ON lineups;
DROP POLICY IF EXISTS "Users can insert their own lineups" ON lineups;
DROP POLICY IF EXISTS "Users can update their own lineups" ON lineups;

-- Create new policies
CREATE POLICY "Users can view their own lineups" ON lineups
FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid() IN (
    SELECT unnest(member_ids) FROM leagues WHERE id = league_id
  )
);

CREATE POLICY "Users can insert their own lineups" ON lineups
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own lineups" ON lineups
FOR UPDATE USING (
  auth.uid() = user_id
);

-- 2. Fix teams table RLS
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own teams" ON teams;
DROP POLICY IF EXISTS "Users can insert their own teams" ON teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON teams;

-- Create new policies
CREATE POLICY "Users can view their own teams" ON teams
FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid() IN (
    SELECT unnest(member_ids) FROM leagues WHERE id = league_id
  )
);

CREATE POLICY "Users can insert their own teams" ON teams
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own teams" ON teams
FOR UPDATE USING (
  auth.uid() = user_id
);

-- 3. Fix league_coin_balances table RLS
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own coin balances" ON league_coin_balances;
DROP POLICY IF EXISTS "Users can insert their own coin balances" ON league_coin_balances;
DROP POLICY IF EXISTS "Users can update their own coin balances" ON league_coin_balances;

-- Create new policies
CREATE POLICY "Users can view their own coin balances" ON league_coin_balances
FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid() IN (
    SELECT unnest(member_ids) FROM leagues WHERE id = league_id
  )
);

CREATE POLICY "Users can insert their own coin balances" ON league_coin_balances
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own coin balances" ON league_coin_balances
FOR UPDATE USING (
  auth.uid() = user_id
);

-- 4. Enable RLS on tables if not already enabled
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_coin_balances ENABLE ROW LEVEL SECURITY;

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON lineups TO authenticated;
GRANT SELECT, INSERT, UPDATE ON teams TO authenticated;
GRANT SELECT, INSERT, UPDATE ON league_coin_balances TO authenticated; 