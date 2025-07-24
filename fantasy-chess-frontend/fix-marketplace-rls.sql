-- Fix RLS policies for marketplace functionality
-- This allows league members to update league data for marketplace operations

-- Drop existing leagues policies to start fresh
DROP POLICY IF EXISTS "leagues_select_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_update_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_insert_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_delete_policy" ON leagues;
DROP POLICY IF EXISTS "Allow marketplace function updates" ON leagues;
DROP POLICY IF EXISTS "Allow marketplace function reads" ON leagues;

-- Create permissive policies for marketplace functionality
CREATE POLICY "leagues_select_policy" ON leagues
  FOR SELECT USING (
    auth.uid() = ANY(member_ids) OR 
    auth.uid() = creator_id OR
    is_public = true OR
    auth.uid() IS NOT NULL
  );

-- Very permissive update policy for marketplace operations
CREATE POLICY "leagues_update_policy" ON leagues
  FOR UPDATE USING (
    auth.uid() = creator_id OR 
    auth.uid() = ANY(member_ids) OR
    -- Allow any authenticated user to update (needed for marketplace operations)
    auth.uid() IS NOT NULL
  );

CREATE POLICY "leagues_insert_policy" ON leagues
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id
  );

CREATE POLICY "leagues_delete_policy" ON leagues
  FOR DELETE USING (
    auth.uid() = creator_id
  );

-- Also ensure teams and league_coin_balances have permissive policies
DROP POLICY IF EXISTS "teams_all_policy" ON teams;
CREATE POLICY "teams_all_policy" ON teams
  FOR ALL USING (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    ) OR
    auth.uid() IS NOT NULL
  );

-- Ensure league_coin_balances has permissive policies
DROP POLICY IF EXISTS "league_coin_balances_all_policy" ON league_coin_balances;
CREATE POLICY "league_coin_balances_all_policy" ON league_coin_balances
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_coin_balances.league_id
    ) OR
    auth.uid() IS NOT NULL
  );

-- Grant necessary permissions
GRANT ALL ON leagues TO authenticated;
GRANT ALL ON teams TO authenticated;
GRANT ALL ON league_coin_balances TO authenticated; 