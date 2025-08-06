-- Final comprehensive fix for all database access issues
-- This script will disable RLS and grant all permissions

-- 1. Disable RLS on all tables
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chess_players DISABLE ROW LEVEL SECURITY;

-- 2. Grant ALL permissions to authenticated users
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON leagues TO authenticated;
GRANT ALL ON teams TO authenticated;
GRANT ALL ON bots TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON league_members TO authenticated;
GRANT ALL ON chess_players TO authenticated;

-- 3. Grant ALL permissions to anon users (for public access)
GRANT ALL ON lineups TO anon;
GRANT ALL ON leagues TO anon;
GRANT ALL ON teams TO anon;
GRANT ALL ON bots TO anon;
GRANT ALL ON users TO anon;
GRANT ALL ON league_members TO anon;
GRANT ALL ON chess_players TO anon;

-- 4. Grant ALL permissions to service_role (for admin access)
GRANT ALL ON lineups TO service_role;
GRANT ALL ON leagues TO service_role;
GRANT ALL ON teams TO service_role;
GRANT ALL ON bots TO service_role;
GRANT ALL ON users TO service_role;
GRANT ALL ON league_members TO service_role;
GRANT ALL ON chess_players TO service_role;

-- 5. Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('lineups', 'leagues', 'teams', 'bots', 'users', 'league_members', 'chess_players')
AND schemaname = 'public'
ORDER BY tablename;

-- 6. Test basic queries to ensure they work
-- This will help verify the fix is working
SELECT COUNT(*) as lineups_count FROM lineups LIMIT 1;
SELECT COUNT(*) as leagues_count FROM leagues LIMIT 1;
SELECT COUNT(*) as bots_count FROM bots LIMIT 1;
SELECT COUNT(*) as users_count FROM users LIMIT 1; 