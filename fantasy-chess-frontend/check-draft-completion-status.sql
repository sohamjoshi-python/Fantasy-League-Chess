-- Check and fix draft completion status
-- Run this in your Supabase SQL editor

-- First, let's see the current state of all leagues
SELECT 
    id,
    name,
    member_ids,
    array_length(member_ids, 1) as member_count,
    draft_completed,
    draft_started,
    marketplace_started,
    marketplace_completed,
    current_marketplace_turn,
    -- Check if teams exist for this league
    (SELECT COUNT(*) FROM teams WHERE league_id = leagues.id) as team_count,
    -- Check if all members have teams
    (SELECT COUNT(*) FROM teams t 
     WHERE t.league_id = leagues.id 
     AND t.user_id = ANY(leagues.member_ids)) as members_with_teams
FROM leagues 
ORDER BY created_at DESC;

-- Check which leagues should have draft_completed = true
-- A league should be marked as draft completed if:
-- 1. All members have teams, OR
-- 2. Marketplace has started, OR  
-- 3. Marketplace is completed
SELECT 
    l.id,
    l.name,
    l.draft_completed as current_draft_completed,
    l.marketplace_started,
    l.marketplace_completed,
    array_length(l.member_ids, 1) as member_count,
    (SELECT COUNT(*) FROM teams t WHERE t.league_id = l.id) as team_count,
    (SELECT COUNT(*) FROM teams t 
     WHERE t.league_id = l.id 
     AND t.user_id = ANY(l.member_ids)) as members_with_teams,
    CASE 
        WHEN l.marketplace_completed = true THEN 'SHOULD_BE_TRUE_MARKETPLACE_COMPLETED'
        WHEN l.marketplace_started = true THEN 'SHOULD_BE_TRUE_MARKETPLACE_STARTED'
        WHEN (SELECT COUNT(*) FROM teams t 
              WHERE t.league_id = l.id 
              AND t.user_id = ANY(l.member_ids)) = array_length(l.member_ids, 1) 
        THEN 'SHOULD_BE_TRUE_ALL_MEMBERS_HAVE_TEAMS'
        ELSE 'SHOULD_BE_FALSE'
    END as should_draft_completed_be
FROM leagues l
WHERE l.draft_completed = false; -- Only check leagues that are currently marked as not completed

-- Fix leagues that should have draft_completed = true
UPDATE leagues 
SET draft_completed = true,
    updated_at = NOW()
WHERE id IN (
    SELECT l.id
    FROM leagues l
    WHERE l.draft_completed = false
    AND (
        l.marketplace_completed = true
        OR l.marketplace_started = true
        OR (
            (SELECT COUNT(*) FROM teams t 
             WHERE t.league_id = l.id 
             AND t.user_id = ANY(l.member_ids)) = array_length(l.member_ids, 1)
            AND array_length(l.member_ids, 1) > 0
        )
    )
);

-- Show the results after the fix
SELECT 
    id,
    name,
    draft_completed,
    marketplace_started,
    marketplace_completed,
    array_length(member_ids, 1) as member_count,
    (SELECT COUNT(*) FROM teams t WHERE t.league_id = leagues.id) as team_count
FROM leagues 
WHERE draft_completed = true
ORDER BY updated_at DESC; 