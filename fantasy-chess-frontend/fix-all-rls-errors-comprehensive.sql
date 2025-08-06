-- Comprehensive fix for all RLS errors
-- This script disables RLS on tables that are causing 406/400 errors

-- 1. Disable RLS on lineups table (causing 406 errors)
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on leagues table (causing 400 errors)
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;

-- 3. Disable RLS on teams table
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;

-- 4. Disable RLS on bots table
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;

-- 5. Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 6. Disable RLS on chess_players table
ALTER TABLE chess_players DISABLE ROW LEVEL SECURITY;

-- 7. Disable RLS on marketplace_turns table
ALTER TABLE marketplace_turns DISABLE ROW LEVEL SECURITY;

-- 8. Disable RLS on league_coin_balances table
ALTER TABLE league_coin_balances DISABLE ROW LEVEL SECURITY;

-- 9. Grant all permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 10. Grant all permissions to anon users (for public access)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 11. Grant all permissions to service_role (for admin functions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify the changes
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('lineups', 'leagues', 'teams', 'bots', 'users', 'chess_players', 'marketplace_turns', 'league_coin_balances')
ORDER BY tablename; 