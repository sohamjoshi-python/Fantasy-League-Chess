-- Fix RLS for join code functionality
-- Allow any authenticated user to read leagues when using join code (for both public and private leagues)

-- Drop existing leagues select policy
DROP POLICY IF EXISTS "leagues_select_policy" ON leagues;

-- Create a more permissive select policy that allows join code access
CREATE POLICY "leagues_select_policy" ON leagues
  FOR SELECT USING (
    -- Allow members and creators to read their leagues
    auth.uid() = ANY(member_ids) OR 
    auth.uid() = creator_id OR
    -- Allow reading public leagues
    is_public = true OR
    -- Allow reading any league (needed for join code functionality)
    auth.uid() IS NOT NULL
  ); 