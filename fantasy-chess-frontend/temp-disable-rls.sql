-- Temporarily disable RLS for testing league deletion
-- WARNING: This is for testing only - re-enable RLS after testing

-- Disable RLS on all tables
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_turns DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_coin_balances DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('leagues', 'teams', 'lineups', 'league_members', 'bots', 'marketplace_turns', 'league_coin_balances')
ORDER BY tablename;

-- Test the delete function now
-- Replace 'YOUR_LEAGUE_ID' with the actual league ID
-- SELECT delete_league_safe('YOUR_LEAGUE_ID'::uuid);

-- IMPORTANT: Re-enable RLS after testing
-- Run this after testing:
/*
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_coin_balances ENABLE ROW LEVEL SECURITY;
*/ 