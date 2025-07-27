-- Diagnose and fix draft completion synchronization issues
-- Run this in your Supabase SQL editor

-- Step 1: Check current state of all leagues
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
    -- Check if teams exist
    (SELECT COUNT(*) FROM teams WHERE league_id = leagues.id) as team_count,
    -- Check if all members have teams
    (SELECT COUNT(*) FROM teams t 
     WHERE t.league_id = leagues.id 
     AND t.user_id = ANY(leagues.member_ids)) as members_with_teams,
    -- Check if marketplace has any turns
    (SELECT COUNT(*) FROM marketplace_turns WHERE league_id = leagues.id) as marketplace_turn_count
FROM leagues 
ORDER BY created_at DESC;

-- Step 2: Identify leagues with inconsistent state
-- These are leagues that should be marked as completed but aren't
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
    (SELECT COUNT(*) FROM marketplace_turns WHERE league_id = l.id) as marketplace_turn_count,
    CASE 
        WHEN l.marketplace_completed = true THEN 'SHOULD_BE_TRUE_MARKETPLACE_COMPLETED'
        WHEN l.marketplace_started = true AND l.current_marketplace_turn > 0 THEN 'SHOULD_BE_TRUE_MARKETPLACE_IN_PROGRESS'
        WHEN (SELECT COUNT(*) FROM teams t 
              WHERE t.league_id = l.id 
              AND t.user_id = ANY(l.member_ids)) = array_length(l.member_ids, 1) 
        THEN 'SHOULD_BE_TRUE_ALL_MEMBERS_HAVE_TEAMS'
        ELSE 'SHOULD_BE_FALSE'
    END as should_draft_completed_be,
    'INCONSISTENT' as status
FROM leagues l
WHERE l.draft_completed = false
AND (
    l.marketplace_completed = true
    OR (l.marketplace_started = true AND l.current_marketplace_turn > 0)
    OR (
        (SELECT COUNT(*) FROM teams t 
         WHERE t.league_id = l.id 
         AND t.user_id = ANY(l.member_ids)) = array_length(l.member_ids, 1)
        AND array_length(l.member_ids, 1) > 0
    )
);

-- Step 3: Fix inconsistent leagues
-- Update draft_completed to true for leagues that should be completed
UPDATE leagues 
SET draft_completed = true,
    updated_at = NOW()
WHERE id IN (
    SELECT l.id
    FROM leagues l
    WHERE l.draft_completed = false
    AND (
        l.marketplace_completed = true
        OR (l.marketplace_started = true AND l.current_marketplace_turn > 0)
        OR (
            (SELECT COUNT(*) FROM teams t 
             WHERE t.league_id = l.id 
             AND t.user_id = ANY(l.member_ids)) = array_length(l.member_ids, 1)
            AND array_length(l.member_ids, 1) > 0
        )
    )
);

-- Step 4: Also ensure marketplace_completed is set correctly
-- If marketplace has started and all turns are done, mark as completed
UPDATE leagues 
SET marketplace_completed = true,
    updated_at = NOW()
WHERE id IN (
    SELECT l.id
    FROM leagues l
    WHERE l.marketplace_started = true 
    AND l.marketplace_completed = false
    AND l.current_marketplace_turn >= array_length(l.marketplace_order, 1)
    AND array_length(l.marketplace_order, 1) > 0
);

-- Step 5: Show final state after fixes
SELECT 
    id,
    name,
    draft_completed,
    marketplace_started,
    marketplace_completed,
    current_marketplace_turn,
    array_length(member_ids, 1) as member_count,
    (SELECT COUNT(*) FROM teams t WHERE t.league_id = leagues.id) as team_count,
    'FIXED' as status
FROM leagues 
WHERE draft_completed = true OR marketplace_completed = true
ORDER BY updated_at DESC;

-- Step 6: Check which leagues would now be processed by the weekly function
SELECT 
    l.id,
    l.name,
    l.draft_completed,
    l.marketplace_completed,
    l.marketplace_started,
    array_length(l.member_ids, 1) as member_count,
    (SELECT COUNT(*) FROM teams t WHERE t.league_id = l.id) as team_count,
    'WILL_BE_PROCESSED' as function_result
FROM leagues l
WHERE l.start_date <= '2025-07-21'::date 
  AND l.end_date >= '2025-07-21'::date
  AND EXISTS (
      SELECT 1 FROM teams t WHERE t.league_id = l.id
  ); 