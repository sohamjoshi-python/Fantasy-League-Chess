-- Fix league deletion issues
-- Run this in your Supabase SQL editor

-- Step 1: Check current foreign key constraints that might prevent deletion
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'leagues'
ORDER BY tc.table_name, kcu.column_name;

-- Step 2: Ensure all foreign key constraints have CASCADE delete
-- This will allow league deletion to automatically delete related records

-- Fix teams table foreign key
ALTER TABLE teams 
DROP CONSTRAINT IF EXISTS teams_league_id_fkey;

ALTER TABLE teams 
ADD CONSTRAINT teams_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;

-- Fix lineups table foreign key
ALTER TABLE lineups 
DROP CONSTRAINT IF EXISTS lineups_league_id_fkey;

ALTER TABLE lineups 
ADD CONSTRAINT lineups_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;

-- Fix league_members table foreign key
ALTER TABLE league_members 
DROP CONSTRAINT IF EXISTS league_members_league_id_fkey;

ALTER TABLE league_members 
ADD CONSTRAINT league_members_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;

-- Fix bots table foreign key
ALTER TABLE bots 
DROP CONSTRAINT IF EXISTS bots_league_id_fkey;

ALTER TABLE bots 
ADD CONSTRAINT bots_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;

-- Fix marketplace_turns table foreign key
ALTER TABLE marketplace_turns 
DROP CONSTRAINT IF EXISTS marketplace_turns_league_id_fkey;

ALTER TABLE marketplace_turns 
ADD CONSTRAINT marketplace_turns_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;

-- Fix league_coin_balances table foreign key
ALTER TABLE league_coin_balances 
DROP CONSTRAINT IF EXISTS league_coin_balances_league_id_fkey;

ALTER TABLE league_coin_balances 
ADD CONSTRAINT league_coin_balances_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;

-- Step 3: Ensure RLS policies are correct for league deletion
-- Drop existing policies
DROP POLICY IF EXISTS "leagues_select_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_update_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_insert_policy" ON leagues;
DROP POLICY IF EXISTS "leagues_delete_policy" ON leagues;

-- Recreate policies with proper delete policy
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

-- Step 4: Create a function to safely delete a league and all related data
CREATE OR REPLACE FUNCTION public.delete_league_safe(league_uuid UUID)
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
BEGIN
    -- Check if league exists and user is the creator
    SELECT * INTO league_record
    FROM leagues
    WHERE id = league_uuid AND creator_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'League not found or you are not the creator';
    END IF;
    
    -- Delete related data in the correct order to avoid foreign key issues
    -- Delete marketplace turns first
    DELETE FROM marketplace_turns WHERE league_id = league_uuid;
    
    -- Delete lineups
    DELETE FROM lineups WHERE league_id = league_uuid;
    
    -- Delete teams
    DELETE FROM teams WHERE league_id = league_uuid;
    
    -- Delete league members
    DELETE FROM league_members WHERE league_id = league_uuid;
    
    -- Delete bots
    DELETE FROM bots WHERE league_id = league_uuid;
    
    -- Delete league coin balances
    DELETE FROM league_coin_balances WHERE league_id = league_uuid;
    
    -- Finally delete the league
    DELETE FROM leagues WHERE id = league_uuid;
    
    RAISE NOTICE 'League % and all related data deleted successfully', league_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_league_safe(UUID) TO authenticated;

-- Step 5: Verify the function was created
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'delete_league_safe';

-- Step 6: Show updated foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'leagues'
ORDER BY tc.table_name, kcu.column_name; 