-- RLS policy: Only allow lineup changes on Monday (1) and Tuesday (2) UTC
DROP POLICY IF EXISTS "lineup_changes_only_mon_tue" ON public.lineups;
CREATE POLICY "lineup_changes_only_mon_tue" ON public.lineups
  FOR ALL
  USING (
    EXTRACT(DOW FROM NOW() AT TIME ZONE 'UTC') IN (1, 2)
  )
  WITH CHECK (
    EXTRACT(DOW FROM NOW() AT TIME ZONE 'UTC') IN (1, 2)
  ); 