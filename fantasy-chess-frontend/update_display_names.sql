-- Update display names in league_members table
-- This script will update the display names with the correct values

-- First, let's see what we currently have
SELECT 
    lm.league_id,
    lm.user_id,
    lm.display_name,
    lm.email,
    CASE 
        WHEN lm.user_id = '5d1e2c4f-74c1-45d6-b4bb-84c2171601c8' THEN 'Dev 1'
        WHEN lm.user_id = '44301f27-6de4-43c8-b6ec-8a1e3d450288' THEN 'Dev 2'
        ELSE 'Unknown'
    END as expected_display_name
FROM league_members lm
ORDER BY lm.league_id, lm.user_id;

-- Update display names with correct values
UPDATE league_members 
SET display_name = 'Dev 1'
WHERE user_id = '5d1e2c4f-74c1-45d6-b4bb-84c2171601c8';

UPDATE league_members 
SET display_name = 'Dev 2'
WHERE user_id = '44301f27-6de4-43c8-b6ec-8a1e3d450288';

-- Verify the updates
SELECT 
    lm.league_id,
    lm.user_id,
    lm.display_name,
    lm.email
FROM league_members lm
ORDER BY lm.league_id, lm.user_id; 