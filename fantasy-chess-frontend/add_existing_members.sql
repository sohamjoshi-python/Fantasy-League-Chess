-- Add existing league members to the league_members table
-- Run this after creating the league_members table

-- First, let's see what leagues and members we have
SELECT 
    l.id as league_id,
    l.name as league_name,
    l.member_ids,
    array_length(l.member_ids, 1) as member_count
FROM leagues l
WHERE array_length(l.member_ids, 1) > 0;

-- Now add existing members to league_members table
-- We'll use email as display_name for now since we can't get Auth metadata from SQL
INSERT INTO league_members (league_id, user_id, display_name, email)
SELECT 
    l.id as league_id,
    unnest(l.member_ids) as user_id,
    u.email as display_name,
    u.email
FROM leagues l
JOIN users u ON u.id = ANY(l.member_ids)
WHERE array_length(l.member_ids, 1) > 0
ON CONFLICT (league_id, user_id) DO NOTHING;

-- Verify the data was added
SELECT 
    lm.league_id,
    l.name as league_name,
    lm.user_id,
    lm.display_name,
    lm.email,
    lm.joined_at
FROM league_members lm
JOIN leagues l ON l.id = lm.league_id
ORDER BY lm.league_id, lm.joined_at; 