-- Remove leagues array column from chess_players
-- league_owners is now the single source of truth for ownership
ALTER TABLE public.chess_players DROP COLUMN IF EXISTS leagues; 