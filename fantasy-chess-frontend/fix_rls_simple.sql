-- Re-enable RLS with simple, working policies
-- Based on testing that showed the leave league functionality works without RLS

-- Re-enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "teams_select_policy" ON teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON teams;
DROP POLICY IF EXISTS "teams_update_policy" ON teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON teams;
DROP POLICY IF EXISTS "lineups_select_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_insert_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_update_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_delete_policy" ON lineups;
DROP POLICY IF EXISTS "leagues_select_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_insert_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_update_policy" ON leagues;
DROP POLICY IF EXISTS "league_members_select_policy" ON league_members;
DROP POLICY IF EXISTS "league_members_insert_policy" ON league_members;
DROP POLICY IF EXISTS "league_members_delete_policy" ON league_members;

-- Simple teams policies - allow users to do everything with their own teams
CREATE POLICY "teams_all_policy" ON teams
  FOR ALL USING (
    user_id = auth.uid() OR bot_id IS NOT NULL
  );

-- Simple lineups policies - allow users to do everything with their own lineups  
CREATE POLICY "lineups_all_policy" ON lineups
  FOR ALL USING (
    user_id = auth.uid() OR bot_id IS NOT NULL
  );

-- Simple leagues policies - allow members to read and update
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

-- Simple league_members policies
CREATE POLICY "league_members_all_policy" ON league_members
  FOR ALL USING (
    user_id = auth.uid() OR auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_members.league_id
    )
  ); 