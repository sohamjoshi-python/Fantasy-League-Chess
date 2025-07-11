-- Test bot teams with new schema
-- Run this after applying fix_bot_teams.sql

-- Test 1: Create a team for the existing bot
INSERT INTO public.teams (bot_id, league_id, player_ids)
SELECT
    'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f',
    'fc508bbc-5841-4e9b-8b69-e52a2f697e70',
    ARRAY[]::uuid[]
WHERE NOT EXISTS (
    SELECT 1 FROM public.teams
    WHERE bot_id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f'
      AND league_id = 'fc508bbc-5841-4e9b-8b69-e52a2f697e70'
);

-- Test 2: Verify team was created
SELECT 
    'Bot team created' as status,
    t.id,
    t.bot_id,
    t.user_id,
    t.league_id,
    t.player_ids,
    b.name as bot_name
FROM public.teams t
JOIN public.bots b ON t.bot_id = b.id
WHERE t.bot_id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f';

-- Test 3: Try to add a player to the bot's team
UPDATE public.teams 
SET player_ids = ARRAY['5de87b54-266d-4091-b922-58931201206a']::uuid[]
WHERE bot_id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f';

-- Test 4: Verify player was added
SELECT 
    'Player added to bot team' as status,
    t.id,
    t.bot_id,
    t.player_ids,
    b.name as bot_name
FROM public.teams t
JOIN public.bots b ON t.bot_id = b.id
WHERE t.bot_id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f';

-- Test 5: Create a lineup for the bot
INSERT INTO public.lineups (bot_id, league_id, week_start_date, player_ids, total_points)
SELECT
    'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f',
    'fc508bbc-5841-4e9b-8b69-e52a2f697e70',
    '2025-07-08',
    ARRAY['5de87b54-266d-4091-b922-58931201206a']::uuid[],
    0
WHERE NOT EXISTS (
    SELECT 1 FROM public.lineups
    WHERE bot_id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f'
      AND league_id = 'fc508bbc-5841-4e9b-8b69-e52a2f697e70'
      AND week_start_date = '2025-07-08'
);

-- Test 6: Verify lineup was created
SELECT 
    'Bot lineup created' as status,
    l.id,
    l.bot_id,
    l.user_id,
    l.league_id,
    l.week_start_date,
    l.player_ids,
    b.name as bot_name
FROM public.lineups l
JOIN public.bots b ON l.bot_id = b.id
WHERE l.bot_id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f';

-- Clean up test data (optional)
-- DELETE FROM public.lineups WHERE bot_id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f';
-- DELETE FROM public.teams WHERE bot_id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f'; 