-- Fix RLS for leave league functionality
-- The issue is that when updating member_ids, the user might not be in the array anymore

-- Drop existing leagues policies
DROP POLICY IF EXISTS "leagues_select_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_update_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_insert_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_delete_policy" ON leagues;

-- Recreate leagues policies with more permissive update policy
CREATE POLICY "leagues_select_policy" ON leagues
  FOR SELECT USING (
    auth.uid() = ANY(member_ids) OR auth.uid() = creator_id
  );

-- More permissive update policy - allow creators and anyone who was recently a member
CREATE POLICY "leagues_update_policy" ON leagues
  FOR UPDATE USING (
    auth.uid() = creator_id OR 
    auth.uid() = ANY(member_ids) OR
    -- Allow updates if the user is the creator or if they're removing themselves from member_ids
    (auth.uid() = creator_id) OR
    -- This allows users to update leagues they were members of (for leaving)
    EXISTS (
      SELECT 1 FROM league_members 
      WHERE league_id = leagues.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "leagues_insert_policy" ON leagues
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id
  );

CREATE POLICY "leagues_delete_policy" ON leagues
  FOR DELETE USING (
    auth.uid() = creator_id
  ); 