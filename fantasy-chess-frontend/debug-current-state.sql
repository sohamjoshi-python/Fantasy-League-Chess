-- Debug current state of all tables

-- 1. Check if tables exist and their RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('lineups', 'teams', 'league_coin_balances')
ORDER BY tablename;

-- 2. Check table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('lineups', 'teams', 'league_coin_balances')
ORDER BY table_name, ordinal_position;

-- 3. Check permissions
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name IN ('lineups', 'teams', 'league_coin_balances')
AND grantee IN ('authenticated', 'anon', 'service_role')
ORDER BY table_name, grantee;

-- 4. Check row counts
SELECT 
    'lineups' as table_name, COUNT(*) as row_count FROM lineups
UNION ALL
SELECT 'teams' as table_name, COUNT(*) as row_count FROM teams
UNION ALL
SELECT 'league_coin_balances' as table_name, COUNT(*) as row_count FROM league_coin_balances;

-- 5. Test a simple query
SELECT * FROM lineups LIMIT 1; 