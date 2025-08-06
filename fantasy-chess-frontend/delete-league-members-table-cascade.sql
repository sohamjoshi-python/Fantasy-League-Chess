-- Delete the league_members table with CASCADE to handle dependencies
-- The leagues.member_ids array is used instead

-- Drop the table with CASCADE to remove dependent objects
DROP TABLE IF EXISTS league_members CASCADE;

-- Verify the table is gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'league_members';

-- Check if any policies were dropped
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'league_members'; 