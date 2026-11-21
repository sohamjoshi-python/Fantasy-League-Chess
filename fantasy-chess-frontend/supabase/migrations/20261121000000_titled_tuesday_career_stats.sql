-- Career Titled Tuesday totals from Chess.com, filled by sync_tt_career_stats.py.
-- chess_players.games stays as is: it is the number of games behind the running ACL average.

ALTER TABLE public.chess_players
  ADD COLUMN IF NOT EXISTS tt_career_events integer,
  ADD COLUMN IF NOT EXISTS tt_career_games integer,
  ADD COLUMN IF NOT EXISTS tt_career_wins integer,
  ADD COLUMN IF NOT EXISTS tt_career_draws integer,
  ADD COLUMN IF NOT EXISTS tt_career_losses integer,
  ADD COLUMN IF NOT EXISTS tt_best_finish integer,
  ADD COLUMN IF NOT EXISTS tt_event_wins integer,
  ADD COLUMN IF NOT EXISTS tt_career_synced_at timestamptz;

NOTIFY pgrst, 'reload schema';
