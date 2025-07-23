-- Add league_owners JSONB column to chess_players
ALTER TABLE public.chess_players
ADD COLUMN IF NOT EXISTS league_owners JSONB DEFAULT '{}';

-- Migrate ownership from user_players
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT player_id, league_id, user_id FROM public.user_players WHERE player_id IS NOT NULL LOOP
    UPDATE public.chess_players
    SET league_owners = COALESCE(league_owners, '{}'::jsonb) || jsonb_build_object(rec.league_id::text, rec.user_id::text)
    WHERE id = rec.player_id;
  END LOOP;
END $$;

-- For future: league_owners is a map of league_id -> user_id for each player 