-- Fix RLS policies for bots to work properly
-- This migration updates the teams and lineups tables to allow bots to create records

-- Update teams RLS policy to allow bots to create teams
DROP POLICY IF EXISTS "Users can manage their own teams" ON teams;

CREATE POLICY "Users and bots can manage their own teams" ON teams
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM bots 
            WHERE bots.id = teams.user_id 
            AND bots.league_id = teams.league_id
        )
    );

-- Update lineups RLS policy to allow bots to create lineups
DROP POLICY IF EXISTS "Users can manage their own lineups" ON lineups;

CREATE POLICY "Users and bots can manage their own lineups" ON lineups
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM bots 
            WHERE bots.id = lineups.user_id 
            AND bots.league_id = lineups.league_id
        )
    ); 