-- Check current database status

-- 1. Check if tables exist
SELECT 
    table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = t.table_name
    ) as table_exists
FROM (VALUES 
    ('teams'),
    ('lineups'), 
    ('league_coin_balances')
) as t(table_name);

-- 2. Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('lineups', 'teams', 'league_coin_balances')
ORDER BY tablename;

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
    'teams' as table_name, 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') 
        THEN (SELECT COUNT(*) FROM teams)::TEXT 
        ELSE 'TABLE DOES NOT EXIST' 
    END as row_count
UNION ALL
SELECT 
    'lineups' as table_name, 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lineups') 
        THEN (SELECT COUNT(*) FROM lineups)::TEXT 
        ELSE 'TABLE DOES NOT EXIST' 
    END as row_count
UNION ALL
SELECT 
    'league_coin_balances' as table_name, 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'league_coin_balances') 
        THEN (SELECT COUNT(*) FROM league_coin_balances)::TEXT 
        ELSE 'TABLE DOES NOT EXIST' 
    END as row_count;

-- 5. Test a simple query as authenticated user
-- This simulates what the frontend is trying to do
SELECT 'Testing simple teams query' as test_name, COUNT(*) as result 
FROM teams 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID; 