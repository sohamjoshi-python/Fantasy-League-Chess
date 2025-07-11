-- Temporary: Disable RLS for testing leave league functionality
-- WARNING: This is for testing only - re-enable RLS after testing

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_members DISABLE ROW LEVEL SECURITY; 