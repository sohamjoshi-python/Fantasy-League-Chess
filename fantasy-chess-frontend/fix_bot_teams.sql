-- Fix bot teams without modifying users table
-- This approach adds a bot_id column to teams table

-- Step 1: Add bot_id column to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE;

-- Step 2: Make user_id nullable for bot teams
ALTER TABLE public.teams ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Update unique constraints to handle both users and bots
-- Drop the existing unique constraint
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_user_id_league_id_key;
DROP INDEX IF EXISTS teams_user_league_unique;
DROP INDEX IF EXISTS teams_bot_league_unique;

-- Add new unique indexes for users and bots
CREATE UNIQUE INDEX IF NOT EXISTS teams_user_league_unique
    ON public.teams (user_id, league_id)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teams_bot_league_unique
    ON public.teams (bot_id, league_id)
    WHERE bot_id IS NOT NULL;

-- Step 4: Update RLS policies to handle bot teams
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
CREATE POLICY "Users and bots can create teams" ON public.teams
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.bots 
            WHERE bots.id = teams.bot_id 
            AND bots.league_id = teams.league_id
        )
    );

DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
CREATE POLICY "Users and bots can update teams" ON public.teams
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.bots 
            WHERE bots.id = teams.bot_id 
            AND bots.league_id = teams.league_id
        )
    );

-- Step 5: Update lineups table to handle bots
ALTER TABLE public.lineups ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE;
ALTER TABLE public.lineups ALTER COLUMN user_id DROP NOT NULL;

-- Drop the existing unique constraint
ALTER TABLE public.lineups DROP CONSTRAINT IF EXISTS lineups_user_id_league_id_week_start_date_key;
DROP INDEX IF EXISTS lineups_user_league_week_unique;
DROP INDEX IF EXISTS lineups_bot_league_week_unique;

-- Add new unique indexes for users and bots
CREATE UNIQUE INDEX IF NOT EXISTS lineups_user_league_week_unique
    ON public.lineups (user_id, league_id, week_start_date)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lineups_bot_league_week_unique
    ON public.lineups (bot_id, league_id, week_start_date)
    WHERE bot_id IS NOT NULL;

-- Step 6: Update lineups RLS policies
DROP POLICY IF EXISTS "Users can create their own lineups" ON public.lineups;
CREATE POLICY "Users and bots can create lineups" ON public.lineups
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.bots 
            WHERE bots.id = lineups.bot_id 
            AND bots.league_id = lineups.league_id
        )
    );

DROP POLICY IF EXISTS "Users can update their own lineups" ON public.lineups;
CREATE POLICY "Users and bots can update lineups" ON public.lineups
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.bots 
            WHERE bots.id = lineups.bot_id 
            AND bots.league_id = lineups.league_id
        )
    );

-- Step 7: Verify the changes
SELECT 
    'Teams table updated' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'teams' 
AND column_name IN ('user_id', 'bot_id')
ORDER BY column_name; 

-- Step 8: Update RLS SELECT policies for teams and lineups
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;
CREATE POLICY "League members can view all teams in their league" ON public.teams
    FOR SELECT USING (
        (user_id = auth.uid())
        OR (bot_id IS NOT NULL)
        OR (EXISTS (
            SELECT 1 FROM public.leagues 
            WHERE id = league_id AND auth.uid() = ANY(member_ids)
        ))
    );

DROP POLICY IF EXISTS "Users can view their own lineups" ON public.lineups;
CREATE POLICY "League members can view all lineups in their league" ON public.lineups
    FOR SELECT USING (
        (user_id = auth.uid())
        OR (bot_id IS NOT NULL)
        OR (EXISTS (
            SELECT 1 FROM public.leagues 
            WHERE id = league_id AND auth.uid() = ANY(member_ids)
        ))
    ); 