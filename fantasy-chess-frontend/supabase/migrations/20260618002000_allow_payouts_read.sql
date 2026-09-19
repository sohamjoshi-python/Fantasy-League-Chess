-- Let league pages and leaderboards read payout summaries.

GRANT SELECT ON public.payouts TO authenticated;
GRANT SELECT ON public.payouts TO anon;

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view payouts" ON public.payouts;
CREATE POLICY "Anyone can view payouts"
  ON public.payouts
  FOR SELECT
  USING (true);
