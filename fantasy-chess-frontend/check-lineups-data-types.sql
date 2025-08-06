-- Check for data type mismatches in lineups table
-- This might be causing the 406 errors

-- 1. Check the exact data types of the columns being queried
SELECT 
    column_name,
    data_type,
    udt_name,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'lineups' 
AND column_name IN ('user_id', 'league_id', 'week_start_date')
ORDER BY column_name;

-- 2. Check if there are any data type conversion issues
-- Test with explicit type casting
SELECT *
FROM lineups 
WHERE user_id::text = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425' 
AND league_id::text = 'dd4f198b-337c-42b6-acb6-645e088acd68' 
AND week_start_date::text = '2025-07-28';

-- 3. Check if the week_start_date column is actually a date type
SELECT 
    week_start_date,
    pg_typeof(week_start_date) as actual_type
FROM lineups 
LIMIT 5;

-- 4. Check if there are any NULL values in key columns
SELECT 
    COUNT(*) as total_lineups,
    COUNT(user_id) as non_null_user_ids,
    COUNT(league_id) as non_null_league_ids,
    COUNT(week_start_date) as non_null_week_dates
FROM lineups;

-- 5. Check for any unusual data in the lineups table
SELECT 
    id,
    user_id,
    league_id,
    week_start_date,
    pg_typeof(user_id) as user_id_type,
    pg_typeof(league_id) as league_id_type,
    pg_typeof(week_start_date) as week_date_type
FROM lineups 
LIMIT 10; 