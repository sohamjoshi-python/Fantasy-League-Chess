-- Bot migration for Pawn Royale
-- This migration adds support for bots in leagues

-- Create bots table
CREATE TABLE IF NOT EXISTS bots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add bot_id column to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bots_league_id ON bots(league_id);
CREATE INDEX IF NOT EXISTS idx_bots_team_id ON bots(team_id);

-- Add RLS policies for bots table
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

-- Allow league creators to manage bots
CREATE POLICY "League creators can manage bots" ON bots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = bots.league_id 
            AND leagues.creator_id = auth.uid()
        )
    );

-- Allow league members to view bots
CREATE POLICY "League members can view bots" ON bots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = bots.league_id 
            AND auth.uid() = ANY(leagues.member_ids)
        )
    ); 