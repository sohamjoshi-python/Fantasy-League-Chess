-- Temporarily disable RLS on tables causing 406 errors
-- This will allow all authenticated users to access the data

-- Disable RLS on lineups table
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;

-- Disable RLS on teams table  
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;

-- Disable RLS on league_coin_balances table
ALTER TABLE league_coin_balances DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON teams TO authenticated;
GRANT ALL ON league_coin_balances TO authenticated;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('lineups', 'teams', 'league_coin_balances'); 