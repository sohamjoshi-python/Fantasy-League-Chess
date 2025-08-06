-- Delete the league_members table since it's no longer used
-- The leagues.member_ids array is used instead

-- First, drop any foreign key constraints that reference league_members
-- (if any exist)

-- Then drop the table
DROP TABLE IF EXISTS league_members;

-- Verify the table is gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'league_members'; 