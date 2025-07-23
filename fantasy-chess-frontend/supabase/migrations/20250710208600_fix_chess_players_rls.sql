-- Fix RLS policies for chess_players table to allow ownership functions to work
-- The chess_players table should allow read access to everyone and update access through RPC functions

-- First, check if RLS is enabled and disable it temporarily
ALTER TABLE chess_players DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with proper policies
ALTER TABLE chess_players ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read chess_players (needed for marketplace)
CREATE POLICY "Anyone can read chess_players" ON chess_players
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Create policy to allow authenticated users to update chess_players through RPC functions
-- This is needed for the set_league_owner_for_player and remove_league_owner_for_player functions
CREATE POLICY "Authenticated users can update chess_players" ON chess_players
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policy to allow system to insert chess_players (if needed for data migration)
CREATE POLICY "System can insert chess_players" ON chess_players
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Grant necessary permissions to the authenticated role
GRANT SELECT, UPDATE, INSERT ON chess_players TO authenticated;
GRANT SELECT ON chess_players TO anon; 