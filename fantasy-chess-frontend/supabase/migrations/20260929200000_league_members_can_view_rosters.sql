-- League members could only read their own team and lineup. Opening another
-- manager from standings therefore came back empty, even when that manager
-- had a lineup on their own screen.
-- Reads are shared inside a league. Writes stay on the existing owner policies.
-- One statement so the linked Supabase CLI can apply it.

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "league_members_can_view_teams" ON public.teams';
  EXECUTE 'CREATE POLICY "league_members_can_view_teams" ON public.teams FOR SELECT TO authenticated USING (public.user_is_league_participant(league_id))';

  EXECUTE 'DROP POLICY IF EXISTS "league_members_can_view_lineups" ON public.lineups';
  EXECUTE 'CREATE POLICY "league_members_can_view_lineups" ON public.lineups FOR SELECT TO authenticated USING (public.user_is_league_participant(league_id))';
END $$;
