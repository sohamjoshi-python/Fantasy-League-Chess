-- 20261119180000 turned the blanket "Enable all operations for all users" policies off,
-- expecting narrower policies to already cover what the app does. On the live database some
-- of those narrower policies never existed, so these actions lost access entirely:
--   * reading chess_players (marketplaces and lineups showed no players)
--   * a league creator saving a new bot's 50-coin balance
--   * a league creator updating a bot's lineup
--   * removing a member's team and lineups when they leave or are removed
-- This adds the narrow policies, widens one in place, and gives bots created since then the
-- balance they should have. Nothing is dropped. One permissive policy per role and action is kept.

CREATE POLICY chess_players_public_read
  ON public.chess_players
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY league_coin_balances_creator_adds_bot
  ON public.league_coin_balances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL
    AND bot_id IS NOT NULL
    AND coin_balance = 50
    AND EXISTS (
      SELECT 1
      FROM public.bots
      JOIN public.leagues ON leagues.id = bots.league_id
      WHERE bots.id = league_coin_balances.bot_id
        AND bots.league_id = league_coin_balances.league_id
        AND leagues.creator_id = (SELECT auth.uid())
    )
  );

ALTER POLICY lineups_owner_can_update
  ON public.lineups
  USING (
    user_id = (SELECT auth.uid())
    OR (
      bot_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.leagues
        WHERE leagues.id = lineups.league_id
          AND leagues.creator_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (
      bot_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.leagues
        WHERE leagues.id = lineups.league_id
          AND leagues.creator_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY teams_leave_or_creator_removes
  ON public.teams
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.leagues
      WHERE leagues.id = teams.league_id
        AND leagues.creator_id = (SELECT auth.uid())
    )
  );

CREATE POLICY lineups_leave_or_creator_removes
  ON public.lineups
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.leagues
      WHERE leagues.id = lineups.league_id
        AND leagues.creator_id = (SELECT auth.uid())
    )
  );

DO $$
DECLARE
  added integer;
BEGIN
  INSERT INTO public.league_coin_balances (bot_id, league_id, coin_balance)
  SELECT bots.id, bots.league_id, 50
  FROM public.bots
  JOIN public.leagues ON leagues.id = bots.league_id
  WHERE NOT COALESCE(leagues.marketplace_completed, false)
    AND NOT EXISTS (
      SELECT 1
      FROM public.league_coin_balances AS balance
      WHERE balance.bot_id = bots.id
    );
  GET DIAGNOSTICS added = ROW_COUNT;
  RAISE NOTICE 'Gave % bot(s) their missing 50-coin balance', added;
END $$;

NOTIFY pgrst, 'reload schema';
