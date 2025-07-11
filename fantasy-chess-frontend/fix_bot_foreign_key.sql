-- Fix bot foreign key constraint issue
-- This migration adds the existing bot to the users table

-- Step 1: Add bot columns to users table if they don't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bot_name TEXT;

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

-- Step 3: Add any other existing bots to the users table
INSERT INTO public.users (id, email, username, is_bot, bot_name, coins, created_at, updated_at)
SELECT 
    b.id,
    b.name || '@bot.local' as email,
    b.name as username,
    true as is_bot,
    b.name as bot_name,
    0 as coins,
    b.created_at,
    NOW() as updated_at
FROM public.bots b
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = b.id
);

-- Step 4: Update RLS policies to handle bot users
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
CREATE POLICY "Users and bots can create teams" ON public.teams
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = teams.user_id AND u.is_bot = true
        )
    );

DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
CREATE POLICY "Users and bots can update teams" ON public.teams
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = teams.user_id AND u.is_bot = true
        )
    );

-- Step 5: Update lineups RLS policies to handle bot users
DROP POLICY IF EXISTS "Users can create their own lineups" ON public.lineups;
CREATE POLICY "Users and bots can create lineups" ON public.lineups
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = lineups.user_id AND u.is_bot = true
        )
    );

DROP POLICY IF EXISTS "Users can update their own lineups" ON public.lineups;
CREATE POLICY "Users and bots can update lineups" ON public.lineups
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = lineups.user_id AND u.is_bot = true
        )
    );

-- Step 6: Create a function to automatically add new bots to users table
CREATE OR REPLACE FUNCTION public.add_bot_to_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the bot into users table if it doesn't exist
    INSERT INTO public.users (id, email, username, is_bot, bot_name, coins, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.name || '@bot.local',
        NEW.name,
        true,
        NEW.name,
        0,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        is_bot = EXCLUDED.is_bot,
        bot_name = EXCLUDED.bot_name,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to automatically add bots to users table
DROP TRIGGER IF EXISTS on_bot_created ON public.bots;
CREATE TRIGGER on_bot_created
    AFTER INSERT ON public.bots
    FOR EACH ROW EXECUTE FUNCTION public.add_bot_to_users();

-- Step 8: Verify the fix
SELECT 
    'Bot exists in users table' as check_result,
    u.id,
    u.is_bot,
    u.bot_name
FROM public.users u
WHERE u.id = 'af370e8c-cc2f-4267-a11d-b6cffe6f5b2f'; 