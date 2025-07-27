-- Debug lineups table structure and data

-- 1. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'lineups' 
ORDER BY ordinal_position;

-- 2. Check if table exists and has data
SELECT COUNT(*) as total_lineups FROM lineups;

-- 3. Check sample data
SELECT * FROM lineups LIMIT 5;

-- 4. Check if the specific query would work
SELECT * FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425' 
  AND league_id = 'aa72597c-7ac4-4164-ae8e-891389b4a641' 
  AND week_start_date = '2025-07-21';

-- 5. Check if the columns exist
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'user_id') THEN 'user_id exists' ELSE 'user_id missing' END as user_id_check,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'league_id') THEN 'league_id exists' ELSE 'league_id missing' END as league_id_check,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lineups' AND column_name = 'week_start_date') THEN 'week_start_date exists' ELSE 'week_start_date missing' END as week_start_date_check;

-- 6. Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'lineups'; 