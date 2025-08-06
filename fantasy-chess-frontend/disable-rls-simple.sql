-- Simple RLS disable - just disable RLS on all tables
-- This is the most straightforward fix

-- Disable RLS on all problematic tables
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_members DISABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON leagues TO authenticated;
GRANT ALL ON teams TO authenticated;
GRANT ALL ON bots TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON league_members TO authenticated;

-- Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('lineups', 'leagues', 'teams', 'bots', 'users', 'league_members')
AND schemaname = 'public'; 