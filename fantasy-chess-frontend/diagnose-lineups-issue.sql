-- Diagnostic script to check lineups table issues
-- This will help identify why we're still getting 406 errors

-- 1. Check the lineups table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lineups' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there are any lineups for this specific user and league
SELECT COUNT(*) as lineup_count
FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425' 
AND league_id = 'dd4f198b-337c-42b6-acb6-645e088acd68'
AND week_start_date = '2025-07-28';

-- 3. Check all lineups for this league
SELECT 
    id,
    user_id,
    league_id,
    week_start_date,
    player_ids,
    total_points,
    created_at
FROM lineups 
WHERE league_id = 'dd4f198b-337c-42b6-acb6-645e088acd68'
ORDER BY week_start_date DESC, created_at DESC;

-- 4. Check if the user exists in the users table
SELECT 
    id,
    email,
    username,
    created_at
FROM users 
WHERE id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425';

-- 5. Check if the league exists
SELECT 
    id,
    name,
    creator_id,
    member_ids,
    created_at
FROM leagues 
WHERE id = 'dd4f198b-337c-42b6-acb6-645e088acd68';

-- 6. Test the exact query that's failing
SELECT *
FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425' 
AND league_id = 'dd4f198b-337c-42b6-acb6-645e088acd68' 
AND week_start_date = '2025-07-28'; 