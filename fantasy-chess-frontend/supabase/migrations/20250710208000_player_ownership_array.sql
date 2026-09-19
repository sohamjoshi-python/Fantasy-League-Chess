-- Migration: Switch to array-based player ownership
-- 1. Add leagues array to chess_players
ALTER TABLE public.chess_players
ADD COLUMN IF NOT EXISTS leagues UUID[] DEFAULT '{}';

-- 2. Migrate ownership from user_players to chess_players.leagues
UPDATE public.chess_players cp
SET leagues = sub.leagues
FROM (
  SELECT
    up.player_id,
    array_agg(DISTINCT up.league_id) AS leagues
  FROM public.user_players up
  WHERE up.player_id IS NOT NULL
  GROUP BY up.player_id
) sub
WHERE cp.id = sub.player_id;

-- 3. Add GIN index for fast search
CREATE INDEX IF NOT EXISTS idx_chess_players_leagues ON public.chess_players USING GIN (leagues);

-- 4. (Optional) Archive old ownership tables
-- DROP TABLE IF EXISTS public.user_players CASCADE;
-- DROP TABLE IF EXISTS public.player_marketplace CASCADE; 