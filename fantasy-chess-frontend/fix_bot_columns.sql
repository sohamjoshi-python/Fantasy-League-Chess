-- Fix bot columns and add bot to users table
-- Run this in your Supabase SQL editor

-- Step 1: Add bot columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bot_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Add the specific bot that's causing the error to the users table
INSERT INTO public.users (id, email, username, is_bot, bot_name, coins, created_at, updated_at)
VALUES (
    'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f', -- The bot ID from the error
    'Bot@bot.local',
    'Bot',
    true,
    'Bot',
    0,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    is_bot = EXCLUDED.is_bot,
    bot_name = EXCLUDED.bot_name,
    updated_at = NOW();

-- Step 3: Verify the bot was added
SELECT 
    'Bot added to users table' as status,
    id,
    email,
    username,
    is_bot,
    bot_name
FROM public.users 
WHERE id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f'; 