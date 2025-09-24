-- Test the Fixed Public League Filtering
-- This should now properly exclude leagues that started today or earlier

-- Check current date
SELECT CURRENT_DATE as today;

-- Test the filtering logic
SELECT 
    id,
    name,
    start_date,
    is_public,
    CURRENT_DATE as today,
    start_date > CURRENT_DATE as should_show_with_gt,
    start_date >= CURRENT_DATE as would_show_with_gte
FROM leagues 
WHERE is_public = true
ORDER BY start_date DESC;

-- Check what the frontend query would return with the fix
SELECT 
    id,
    name,
    start_date,
    is_public
FROM leagues 
WHERE is_public = true
AND start_date > CURRENT_DATE  -- This is the fix: gt instead of gte
ORDER BY created_at DESC;
