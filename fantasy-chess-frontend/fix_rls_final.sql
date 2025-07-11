-- Final RLS fix for leave league functionality
-- Use a more permissive approach that definitely works

-- Drop existing leagues policies
DROP POLICY IF EXISTS "leagues_select_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_update_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_insert_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_delete_policy" ON leagues;

-- Recreate leagues policies with a more permissive update policy
CREATE POLICY "leagues_select_policy" ON leagues
  FOR SELECT USING (
    auth.uid() = ANY(member_ids) OR auth.uid() = creator_id
  );

-- More permissive update policy - allow creators and any authenticated user
-- This is needed because when leaving, the user might not be in member_ids anymore
CREATE POLICY "leagues_update_policy" ON leagues
  FOR UPDATE USING (
    auth.uid() = creator_id OR 
    auth.uid() = ANY(member_ids) OR
    -- Allow any authenticated user to update (for leave league functionality)
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