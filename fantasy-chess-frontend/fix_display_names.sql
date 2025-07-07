-- Fix display names in league_members table
-- Update with the correct display names based on user IDs

-- First, let's see what we currently have
SELECT 
    lm.league_id,
    lm.user_id,
    lm.display_name,
    lm.email
FROM league_members lm
ORDER BY lm.league_id, lm.user_id;

-- Update display names with correct values
-- Replace these with the actual display names from your Supabase Auth

-- For user 5d1e2c4f-74c1-45d6-b4bb-84c2171601c8 (replace with actual display name)
UPDATE league_members 
SET display_name = 'Dev 1'  -- Replace with actual display name
WHERE user_id = '5d1e2c4f-74c1-45d6-b4bb-84c2171601c8';

-- For user 44301f27-6de4-43c8-b6ec-8a1e3d450288 (replace with actual display name)
UPDATE league_members 
SET display_name = 'Dev 2'  -- Replace with actual display name
WHERE user_id = '44301f27-6de4-43c8-b6ec-8a1e3d450288';

-- Verify the updates
SELECT 
    lm.league_id,
    lm.user_id,
    lm.display_name,
    lm.email
FROM league_members lm
ORDER BY lm.league_id, lm.user_id; 