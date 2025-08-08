-- Set start date for league 6f2ffdd9-63a2-4b53-b238-d8c28bd40638
UPDATE leagues 
SET start_date = '2025-08-04'::date
WHERE id = '6f2ffdd9-63a2-4b53-b238-d8c28bd40638';

-- Verify the update
SELECT id, name, start_date 
FROM leagues 
WHERE id = '6f2ffdd9-63a2-4b53-b238-d8c28bd40638';
