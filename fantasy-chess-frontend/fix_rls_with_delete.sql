-- Fix RLS to allow league creators to delete their leagues
-- This addresses the delete league functionality issue

-- Drop existing policies
DROP POLICY IF EXISTS "teams_all_policy" ON teams;
DROP POLICY IF EXISTS "lineups_all_policy" ON lineups;
DROP POLICY IF EXISTS "leagues_select_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_update_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_insert_policy" ON leagues;
DROP POLICY IF EXISTS "league_members_all_policy" ON league_members;

-- Teams policies - allow users to manage their own teams, and league creators to manage all teams in their leagues
CREATE POLICY "teams_all_policy" ON teams
  FOR ALL USING (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    )
  );

-- Lineups policies - allow users to manage their own lineups, and league creators to manage all lineups in their leagues
CREATE POLICY "lineups_all_policy" ON lineups
  FOR ALL USING (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = lineups.league_id
    )
  );

-- Leagues policies - allow creators to do everything, members to read and update
CREATE POLICY "leagues_select_policy" ON leagues
  FOR SELECT USING (
    auth.uid() = ANY(member_ids) OR auth.uid() = creator_id
  );

CREATE POLICY "leagues_update_policy" ON leagues
  FOR UPDATE USING (
    auth.uid() = creator_id OR auth.uid() = ANY(member_ids)
  );

CREATE POLICY "leagues_insert_policy" ON leagues
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id
  );

CREATE POLICY "leagues_delete_policy" ON leagues
  FOR DELETE USING (
    auth.uid() = creator_id
  );

-- League members policies - allow users to manage their own memberships, and league creators to manage all memberships
CREATE POLICY "league_members_all_policy" ON league_members
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_members.league_id
    )
  ); 