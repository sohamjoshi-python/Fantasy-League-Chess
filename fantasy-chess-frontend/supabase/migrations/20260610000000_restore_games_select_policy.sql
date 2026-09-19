-- The live games table had RLS enabled but ZERO policies, so any logged-in
-- (authenticated role) browser client silently received 0 rows from every
-- games query. This broke the weekly point breakdown UI, which reads the
-- games table directly. Service-role access (scoring jobs) was unaffected,
-- which is why lineup totals were correct while the breakdown stayed empty.
--
-- Restore the public read policy from supabase_setup.sql (Titled Tuesday
-- game results are public data).

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
CREATE POLICY "Anyone can view games" ON public.games
    FOR SELECT TO public USING (true);
