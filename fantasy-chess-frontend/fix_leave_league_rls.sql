-- Fix RLS policies for leave league functionality
-- Allow users to read and delete their own teams and lineups
-- Allow users to update leagues they are members of

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own teams" ON teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON teams;
DROP POLICY IF EXISTS "Users can read their own lineups" ON lineups;
DROP POLICY IF EXISTS "Users can delete their own lineups" ON lineups;
DROP POLICY IF EXISTS "Users can update leagues they are members of" ON leagues;

-- Teams policies
CREATE POLICY "Users can read their own teams" ON teams
  FOR SELECT USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL)
  );

CREATE POLICY "Users can delete their own teams" ON teams
  FOR DELETE USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL)
  );

-- Lineups policies  
CREATE POLICY "Users can read their own lineups" ON lineups
  FOR SELECT USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL)
  );

CREATE POLICY "Users can delete their own lineups" ON lineups
  FOR DELETE USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL)
  );

-- Leagues policy - allow users to update leagues they are members of
CREATE POLICY "Users can update leagues they are members of" ON leagues
  FOR UPDATE USING (
    auth.uid() = ANY(member_ids)
  ); 