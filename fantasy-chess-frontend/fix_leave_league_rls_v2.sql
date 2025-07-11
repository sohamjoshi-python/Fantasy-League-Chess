-- Comprehensive fix for leave league RLS policies
-- Drop ALL existing policies and recreate them properly

-- First, enable RLS on all tables if not already enabled
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on these tables
DROP POLICY IF EXISTS "Enable read access for all users" ON teams;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON teams;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON teams;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON teams;
DROP POLICY IF EXISTS "Users can read their own teams" ON teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON teams;
DROP POLICY IF EXISTS "Enable read access for all users" ON lineups;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON lineups;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON lineups;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON lineups;
DROP POLICY IF EXISTS "Users can read their own lineups" ON lineups;
DROP POLICY IF EXISTS "Users can delete their own lineups" ON lineups;
DROP POLICY IF EXISTS "Enable read access for all users" ON leagues;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON leagues;
DROP POLICY IF EXISTS "Enable update for users based on creator_id" ON leagues;
DROP POLICY IF EXISTS "Users can update leagues they are members of" ON leagues;
DROP POLICY IF EXISTS "Enable read access for all users" ON league_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON league_members;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON league_members;

-- Create comprehensive policies for teams
CREATE POLICY "teams_select_policy" ON teams
  FOR SELECT USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL) OR
    (auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    ))
  );

CREATE POLICY "teams_insert_policy" ON teams
  FOR INSERT WITH CHECK (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL) OR
    (auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    ))
  );

CREATE POLICY "teams_update_policy" ON teams
  FOR UPDATE USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL) OR
    (auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    ))
  );

CREATE POLICY "teams_delete_policy" ON teams
  FOR DELETE USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL) OR
    (auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    ))
  );

-- Create comprehensive policies for lineups
CREATE POLICY "lineups_select_policy" ON lineups
  FOR SELECT USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL) OR
    (auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = lineups.league_id
    ))
  );

CREATE POLICY "lineups_insert_policy" ON lineups
  FOR INSERT WITH CHECK (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL) OR
    (auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = lineups.league_id
    ))
  );

CREATE POLICY "lineups_update_policy" ON lineups
  FOR UPDATE USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL) OR
    (auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = lineups.league_id
    ))
  );

CREATE POLICY "lineups_delete_policy" ON lineups
  FOR DELETE USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (bot_id IS NOT NULL) OR
    (auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = lineups.league_id
    ))
  );

-- Create comprehensive policies for leagues
CREATE POLICY "leagues_select_policy" ON leagues
  FOR SELECT USING (
    auth.uid() = ANY(member_ids) OR
    auth.uid() = creator_id
  );

CREATE POLICY "leagues_insert_policy" ON leagues
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id
  );

CREATE POLICY "leagues_update_policy" ON leagues
  FOR UPDATE USING (
    auth.uid() = creator_id OR
    auth.uid() = ANY(member_ids)
  );

-- Create comprehensive policies for league_members
CREATE POLICY "league_members_select_policy" ON league_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_members.league_id
    )
  );

CREATE POLICY "league_members_insert_policy" ON league_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_members.league_id
    )
  );

CREATE POLICY "league_members_delete_policy" ON league_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_members.league_id
    )
  ); 