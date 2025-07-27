-- Fix RLS policies to allow league deletion
-- Run this in your Supabase SQL editor

-- Step 1: Check current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('leagues', 'teams', 'lineups', 'league_members', 'bots', 'marketplace_turns', 'league_coin_balances')
ORDER BY tablename, policyname;

-- Step 2: Drop all existing policies and recreate them with proper permissions
-- Leagues table policies
DROP POLICY IF EXISTS "leagues_select_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_update_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_insert_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_delete_policy" ON leagues;

CREATE POLICY "leagues_select_policy" ON leagues
  FOR SELECT USING (
    auth.uid() = ANY(member_ids) OR auth.uid() = creator_id
  );

CREATE POLICY "leagues_update_policy" ON leagues
  FOR UPDATE USING (
    auth.uid() = creator_id OR 
    auth.uid() = ANY(member_ids) OR
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

-- Teams table policies
DROP POLICY IF EXISTS "teams_select_policy" ON teams;
DROP POLICY IF EXISTS "teams_update_policy" ON teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON teams;

CREATE POLICY "teams_select_policy" ON teams
  FOR SELECT USING (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    )
  );

CREATE POLICY "teams_update_policy" ON teams
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    )
  );

CREATE POLICY "teams_insert_policy" ON teams
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    )
  );

CREATE POLICY "teams_delete_policy" ON teams
  FOR DELETE USING (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = teams.league_id
    )
  );

-- Lineups table policies
DROP POLICY IF EXISTS "lineups_select_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_update_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_insert_policy" ON lineups;
DROP POLICY IF EXISTS "lineups_delete_policy" ON lineups;

CREATE POLICY "lineups_select_policy" ON lineups
  FOR SELECT USING (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = lineups.league_id
    )
  );

CREATE POLICY "lineups_update_policy" ON lineups
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = lineups.league_id
    )
  );

CREATE POLICY "lineups_insert_policy" ON lineups
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = lineups.league_id
    )
  );

CREATE POLICY "lineups_delete_policy" ON lineups
  FOR DELETE USING (
    user_id = auth.uid() OR 
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = lineups.league_id
    )
  );

-- League members table policies
DROP POLICY IF EXISTS "league_members_select_policy" ON league_members;
DROP POLICY IF EXISTS "league_members_update_policy" ON league_members;
DROP POLICY IF EXISTS "league_members_insert_policy" ON league_members;
DROP POLICY IF EXISTS "league_members_delete_policy" ON league_members;

CREATE POLICY "league_members_select_policy" ON league_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_members.league_id
    )
  );

CREATE POLICY "league_members_update_policy" ON league_members
  FOR UPDATE USING (
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

-- Bots table policies
DROP POLICY IF EXISTS "bots_select_policy" ON bots;
DROP POLICY IF EXISTS "bots_update_policy" ON bots;
DROP POLICY IF EXISTS "bots_insert_policy" ON bots;
DROP POLICY IF EXISTS "bots_delete_policy" ON bots;

CREATE POLICY "bots_select_policy" ON bots
  FOR SELECT USING (
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = bots.league_id
    )
  );

CREATE POLICY "bots_update_policy" ON bots
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = bots.league_id
    )
  );

CREATE POLICY "bots_insert_policy" ON bots
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = bots.league_id
    )
  );

CREATE POLICY "bots_delete_policy" ON bots
  FOR DELETE USING (
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = bots.league_id
    )
  );

-- Marketplace turns table policies
DROP POLICY IF EXISTS "marketplace_turns_select_policy" ON marketplace_turns;
DROP POLICY IF EXISTS "marketplace_turns_update_policy" ON marketplace_turns;
DROP POLICY IF EXISTS "marketplace_turns_insert_policy" ON marketplace_turns;
DROP POLICY IF EXISTS "marketplace_turns_delete_policy" ON marketplace_turns;

CREATE POLICY "marketplace_turns_select_policy" ON marketplace_turns
  FOR SELECT USING (
    user_id = auth.uid() OR
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = marketplace_turns.league_id
    )
  );

CREATE POLICY "marketplace_turns_update_policy" ON marketplace_turns
  FOR UPDATE USING (
    user_id = auth.uid() OR
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = marketplace_turns.league_id
    )
  );

CREATE POLICY "marketplace_turns_insert_policy" ON marketplace_turns
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = marketplace_turns.league_id
    )
  );

CREATE POLICY "marketplace_turns_delete_policy" ON marketplace_turns
  FOR DELETE USING (
    user_id = auth.uid() OR
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = marketplace_turns.league_id
    )
  );

-- League coin balances table policies
DROP POLICY IF EXISTS "league_coin_balances_select_policy" ON league_coin_balances;
DROP POLICY IF EXISTS "league_coin_balances_update_policy" ON league_coin_balances;
DROP POLICY IF EXISTS "league_coin_balances_insert_policy" ON league_coin_balances;
DROP POLICY IF EXISTS "league_coin_balances_delete_policy" ON league_coin_balances;

CREATE POLICY "league_coin_balances_select_policy" ON league_coin_balances
  FOR SELECT USING (
    user_id = auth.uid() OR
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_coin_balances.league_id
    )
  );

CREATE POLICY "league_coin_balances_update_policy" ON league_coin_balances
  FOR UPDATE USING (
    user_id = auth.uid() OR
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_coin_balances.league_id
    )
  );

CREATE POLICY "league_coin_balances_insert_policy" ON league_coin_balances
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_coin_balances.league_id
    )
  );

CREATE POLICY "league_coin_balances_delete_policy" ON league_coin_balances
  FOR DELETE USING (
    user_id = auth.uid() OR
    bot_id IS NOT NULL OR
    auth.uid() IN (
      SELECT creator_id FROM leagues WHERE id = league_coin_balances.league_id
    )
  );

-- Step 3: Verify all policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('leagues', 'teams', 'lineups', 'league_members', 'bots', 'marketplace_turns', 'league_coin_balances')
ORDER BY tablename, policyname; 