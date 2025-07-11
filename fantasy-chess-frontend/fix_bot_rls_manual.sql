-- Manual fix for bot RLS policies
-- Run this in your Supabase SQL editor

-- Update teams RLS policies to allow bots to create and update teams
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
CREATE POLICY "Users and bots can create teams" ON public.teams
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM bots 
            WHERE bots.id = teams.user_id 
            AND bots.league_id = teams.league_id
        )
    );

DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
CREATE POLICY "Users and bots can update teams" ON public.teams
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM bots 
            WHERE bots.id = teams.user_id 
            AND bots.league_id = teams.league_id
        )
    );

-- Update lineups RLS policies to allow bots to create and update lineups
DROP POLICY IF EXISTS "Users can create their own lineups" ON public.lineups;
CREATE POLICY "Users and bots can create lineups" ON public.lineups
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM bots 
            WHERE bots.id = lineups.user_id 
            AND bots.league_id = lineups.league_id
        )
    );

DROP POLICY IF EXISTS "Users can update their own lineups" ON public.lineups;
CREATE POLICY "Users and bots can update lineups" ON public.lineups
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM bots 
            WHERE bots.id = lineups.user_id 
            AND bots.league_id = lineups.league_id
        )
    ); 