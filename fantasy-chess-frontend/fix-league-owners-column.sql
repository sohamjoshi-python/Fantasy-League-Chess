-- Fix: Add missing league_owners column and functions
-- This fixes the "column league_owners does not exist" error
-- Run this manually in your Supabase SQL editor

-- Step 1: Add league_owners JSONB column to chess_players table
ALTER TABLE public.chess_players
ADD COLUMN IF NOT EXISTS league_owners JSONB DEFAULT '{}';

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_chess_players_league_owners ON public.chess_players USING GIN (league_owners);

-- Step 3: Create function to set league owner for a player
CREATE OR REPLACE FUNCTION set_league_owner_for_player(p_player_id UUID, p_league_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chess_players
  SET league_owners = COALESCE(league_owners, '{}'::jsonb) || jsonb_build_object(p_league_id::text, p_user_id::text)
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create function to remove league owner for a player
CREATE OR REPLACE FUNCTION remove_league_owner_for_player(p_player_id UUID, p_league_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chess_players
  SET league_owners = league_owners - p_league_id::text
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION set_league_owner_for_player(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_league_owner_for_player(UUID, UUID) TO authenticated;

-- Step 6: Migrate existing ownership from teams table to league_owners
-- This will populate the league_owners column with current team ownership
DO $$
DECLARE
  team_record RECORD;
  player_id UUID;
BEGIN
  FOR team_record IN 
    SELECT t.league_id, t.user_id, t.player_ids
    FROM teams t
    WHERE t.player_ids IS NOT NULL AND array_length(t.player_ids, 1) > 0
  LOOP
    FOREACH player_id IN ARRAY team_record.player_ids
    LOOP
      -- Set league owner for each player
      UPDATE public.chess_players
      SET league_owners = COALESCE(league_owners, '{}'::jsonb) || jsonb_build_object(team_record.league_id::text, team_record.user_id::text)
      WHERE id = player_id;
    END LOOP;
  END LOOP;
END $$;

-- Step 7: Verify the column and functions exist
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'chess_players' 
AND column_name = 'league_owners';

SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('remove_league_owner_for_player', 'set_league_owner_for_player')
AND routine_schema = 'public';

-- Step 8: Show sample data to verify migration worked
SELECT 
  id,
  name,
  league_owners
FROM chess_players 
WHERE league_owners IS NOT NULL 
AND league_owners != '{}'::jsonb
LIMIT 5; 