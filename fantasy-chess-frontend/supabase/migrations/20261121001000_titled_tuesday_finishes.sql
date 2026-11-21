-- Every Titled Tuesday a tracked player entered, with their final place.
-- Filled by sync_tt_career_stats.py from Chess.com; readable by everyone like chess_players.

CREATE TABLE IF NOT EXISTS public.titled_tuesday_events (
  slug text PRIMARY KEY,
  name text,
  session text,
  starts_at timestamptz,
  event_date date,
  total_rounds integer,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS titled_tuesday_events_event_date_idx
  ON public.titled_tuesday_events (event_date);

CREATE TABLE IF NOT EXISTS public.titled_tuesday_results (
  player_id uuid NOT NULL REFERENCES public.chess_players(id) ON DELETE CASCADE,
  event_slug text NOT NULL REFERENCES public.titled_tuesday_events(slug) ON DELETE CASCADE,
  placement integer,
  total_players integer,
  wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  status text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, event_slug)
);

CREATE INDEX IF NOT EXISTS titled_tuesday_results_event_slug_idx
  ON public.titled_tuesday_results (event_slug);

ALTER TABLE public.titled_tuesday_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titled_tuesday_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY titled_tuesday_events_public_read
  ON public.titled_tuesday_events
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY titled_tuesday_results_public_read
  ON public.titled_tuesday_results
  FOR SELECT
  TO anon, authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
