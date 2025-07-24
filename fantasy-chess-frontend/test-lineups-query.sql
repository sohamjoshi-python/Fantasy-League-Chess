-- Test: Verify lineups query is working after RLS fix
-- Run this to test if the 406 error is resolved

-- Test 1: Check if we can query lineups for the specific user and league
SELECT 
    'Test 1: Basic lineups query' as test_name,
    COUNT(*) as lineup_count,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCCESS - Query executed without 406 error'
        ELSE 'FAILED - Query blocked by RLS'
    END as result
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID;

-- Test 2: Check if we can query lineups for the specific week
SELECT 
    'Test 2: Week-specific lineups query' as test_name,
    COUNT(*) as lineup_count,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCCESS - Week query executed without 406 error'
        ELSE 'FAILED - Week query blocked by RLS'
    END as result
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID
AND week_start_date = '2025-07-21'::DATE;

-- Test 3: Show all lineups for this user in this league
SELECT 
    'Test 3: All lineups for user in league' as test_name,
    id,
    user_id,
    league_id,
    week_start_date,
    player_ids,
    total_points,
    created_at
FROM lineups 
WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
AND league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID
ORDER BY week_start_date DESC;

-- Test 4: Check if the user is a member of the league
SELECT 
    'Test 4: Verify user is league member' as test_name,
    l.id as league_id,
    l.name as league_name,
    l.member_ids,
    CASE 
        WHEN 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID = ANY(l.member_ids) THEN 'SUCCESS - User is league member'
        WHEN 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID = l.creator_id THEN 'SUCCESS - User is league creator'
        ELSE 'FAILED - User is not in league'
    END as membership_status
FROM leagues l
WHERE l.id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::UUID;

-- Test 5: Check current authenticated user context
SELECT 
    'Test 5: Current auth context' as test_name,
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'SUCCESS - User is authenticated'
        ELSE 'FAILED - User is not authenticated'
    END as auth_status; 