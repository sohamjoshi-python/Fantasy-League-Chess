-- Check bot status in database
-- Run this in your Supabase SQL editor to see the current state

-- Check if bot exists in bots table
SELECT 
    'Bot in bots table' as location,
    id,
    name,
    league_id,
    created_at
FROM public.bots 
WHERE id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f';

-- Check if bot exists in users table
SELECT 
    'Bot in users table' as location,
    id,
    email,
    username,
    is_bot,
    bot_name,
    created_at
FROM public.users 
WHERE id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f';

-- Check if bot has a team
SELECT 
    'Bot team' as location,
    id,
    user_id,
    league_id,
    player_ids,
    created_at
FROM public.teams 
WHERE user_id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f';

-- Check all bots in the system
SELECT 
    'All bots' as location,
    b.id,
    b.name,
    b.league_id,
    u.is_bot,
    u.bot_name
FROM public.bots b
LEFT JOIN public.users u ON b.id = u.id
ORDER BY b.created_at DESC; 