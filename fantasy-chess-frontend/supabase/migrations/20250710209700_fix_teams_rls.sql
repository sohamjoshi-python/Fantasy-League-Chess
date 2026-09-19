-- Reset RLS policies for teams table to fix 406 errors
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Remove all existing policies
DROP POLICY IF EXISTS "League members can view all teams in their league" ON teams;
DROP POLICY IF EXISTS "Users and bots can create teams" ON teams;
DROP POLICY IF EXISTS "Users and bots can manage their own teams" ON teams;
DROP POLICY IF EXISTS "Users and bots can update teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams in their leagues" ON teams;
DROP POLICY IF EXISTS "Users can view their own teams" ON teams;
DROP POLICY IF EXISTS "teams_all_policy" ON teams;
DROP POLICY IF EXISTS "users_can_insert_own_team" ON teams;
DROP POLICY IF EXISTS "users_can_select_own_team" ON teams;
DROP POLICY IF EXISTS "users_can_update_own_team" ON teams;
DROP POLICY IF EXISTS "users_can_delete_own_team" ON teams;

-- Allow users to select their own team
CREATE POLICY "users_can_select_own_team" ON teams
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to insert their own team
CREATE POLICY "users_can_insert_own_team" ON teams
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own team
CREATE POLICY "users_can_update_own_team" ON teams
  FOR UPDATE
  USING (user_id = auth.uid());

-- Allow users to delete their own team
CREATE POLICY "users_can_delete_own_team" ON teams
  FOR DELETE
  USING (user_id = auth.uid()); 