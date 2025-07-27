-- Check league_members table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'league_members' 
ORDER BY ordinal_position;

-- Check if league_members table exists and has data
SELECT COUNT(*) as total_rows FROM league_members;

-- Check sample data
SELECT * FROM league_members LIMIT 5; 