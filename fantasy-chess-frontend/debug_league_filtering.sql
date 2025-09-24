-- Debug Public League Filtering Issue
-- Check what's actually in the database

-- Check current date
SELECT CURRENT_DATE as today;

-- Check all leagues and their start dates
SELECT 
    id,
    name,
    start_date,
    is_public,
    created_at,
    CASE 
        WHEN start_date >= CURRENT_DATE THEN 'Should Show'
        ELSE 'Should Hide'
    END as filter_status
FROM leagues 
WHERE is_public = true
ORDER BY start_date DESC;

-- Check the specific NJBSoft League
SELECT 
    id,
    name,
    start_date,
    is_public,
    CURRENT_DATE as today,
    start_date >= CURRENT_DATE as should_show
FROM leagues 
WHERE name ILIKE '%NJBSoft%';
