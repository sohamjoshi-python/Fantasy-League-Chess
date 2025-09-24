-- Test Public League Date Filtering
-- Run this to verify that leagues with past start dates are properly filtered

-- Check current date
SELECT CURRENT_DATE as today;

-- Check all public leagues and their start dates
SELECT 
    id,
    name,
    start_date,
    is_public,
    CASE 
        WHEN start_date >= CURRENT_DATE THEN 'Future/Current'
        ELSE 'Past'
    END as status
FROM leagues 
WHERE is_public = true
ORDER BY start_date DESC;

-- Check what the frontend query would return
SELECT 
    id,
    name,
    start_date,
    is_public
FROM leagues 
WHERE is_public = true
AND start_date >= CURRENT_DATE
ORDER BY created_at DESC;
