-- Closes access gaps left by older blanket policies, fixes two broken RPCs, and gives the
-- notification inbox the policies and heartbeat function the app already expects.
-- Nothing is dropped: policies are narrowed with ALTER POLICY or added alongside.

-- ---------------------------------------------------------------- leagues
-- Anyone signed in could create leagues for other people, edit any league, or delete any league.

ALTER POLICY flc_insert_1 ON public.leagues
  WITH CHECK (
    creator_id = (SELECT auth.uid())
    AND COALESCE(member_ids, ARRAY[]::uuid[]) <@ ARRAY[(SELECT auth.uid())]
  );

ALTER POLICY flc_delete_1 ON public.leagues
  USING (creator_id = (SELECT auth.uid()));

-- Members still edit draft state directly; trg_guard_league_member_edits limits which columns they can touch.
ALTER POLICY flc_update_1 ON public.leagues
  USING (
    (SELECT auth.uid()) = creator_id
    OR (SELECT auth.uid()) = ANY (COALESCE(member_ids, ARRAY[]::uuid[]))
  )
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

ALTER POLICY flc_update_2 ON public.leagues
  USING (
    (SELECT auth.uid()) = creator_id
    OR (SELECT auth.uid()) = ANY (COALESCE(member_ids, ARRAY[]::uuid[]))
  )
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE OR REPLACE FUNCTION public.guard_league_member_edits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  -- Only direct API writes are limited; RPCs run as their owner and service jobs bypass this.
  IF current_user <> 'authenticated' OR caller IS NOT DISTINCT FROM OLD.creator_id THEN
    RETURN NEW;
  END IF;

  IF NEW.creator_id IS DISTINCT FROM OLD.creator_id
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.is_public IS DISTINCT FROM OLD.is_public
    OR NEW.buy_in IS DISTINCT FROM OLD.buy_in
    OR NEW.max_members IS DISTINCT FROM OLD.max_members
    OR NEW.start_date IS DISTINCT FROM OLD.start_date
    OR NEW.end_date IS DISTINCT FROM OLD.end_date
    OR NEW.join_code IS DISTINCT FROM OLD.join_code
  THEN
    RAISE EXCEPTION 'Only the league creator can change league settings'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (COALESCE(NEW.member_ids, ARRAY[]::uuid[]) <@ COALESCE(OLD.member_ids, ARRAY[]::uuid[]))
    OR EXISTS (
      SELECT 1
      FROM unnest(COALESCE(OLD.member_ids, ARRAY[]::uuid[])) AS old_member(id)
      WHERE old_member.id IS DISTINCT FROM caller
        AND NOT (old_member.id = ANY (COALESCE(NEW.member_ids, ARRAY[]::uuid[])))
    )
  THEN
    RAISE EXCEPTION 'Members can only remove themselves from a league'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.leagues'::regclass AND tgname = 'trg_guard_league_member_edits'
  ) THEN
    CREATE TRIGGER trg_guard_league_member_edits
      BEFORE UPDATE ON public.leagues
      FOR EACH ROW
      EXECUTE PROCEDURE public.guard_league_member_edits();
  END IF;
END $$;

-- ---------------------------------------------------------------- marketplace_turns
-- Draft history was readable and editable by anyone signed in.

ALTER POLICY flc_select_1 ON public.marketplace_turns
  USING (EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = marketplace_turns.league_id
      AND ((SELECT auth.uid()) = leagues.creator_id
        OR (SELECT auth.uid()) = ANY (COALESCE(leagues.member_ids, ARRAY[]::uuid[])))
  ));

ALTER POLICY flc_insert_1 ON public.marketplace_turns
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = marketplace_turns.league_id
      AND ((SELECT auth.uid()) = leagues.creator_id
        OR (SELECT auth.uid()) = ANY (COALESCE(leagues.member_ids, ARRAY[]::uuid[])))
  ));

ALTER POLICY flc_update_1 ON public.marketplace_turns
  USING (EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = marketplace_turns.league_id
      AND ((SELECT auth.uid()) = leagues.creator_id
        OR (SELECT auth.uid()) = ANY (COALESCE(leagues.member_ids, ARRAY[]::uuid[])))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = marketplace_turns.league_id
      AND ((SELECT auth.uid()) = leagues.creator_id
        OR (SELECT auth.uid()) = ANY (COALESCE(leagues.member_ids, ARRAY[]::uuid[])))
  ));

ALTER POLICY flc_delete_1 ON public.marketplace_turns
  USING (EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = marketplace_turns.league_id
      AND leagues.creator_id = (SELECT auth.uid())
  ));

-- ---------------------------------------------------------------- bots
-- Any signed-in user could create, rename, or delete any bot.

ALTER POLICY bots_all_policy ON public.bots
  USING (EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = bots.league_id
      AND ((SELECT auth.uid()) = leagues.creator_id
        OR (SELECT auth.uid()) = ANY (COALESCE(leagues.member_ids, ARRAY[]::uuid[])))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = bots.league_id
      AND leagues.creator_id = (SELECT auth.uid())
  ));

CREATE POLICY bots_only_creator_updates
  ON public.bots
  AS RESTRICTIVE
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = bots.league_id
      AND leagues.creator_id = (SELECT auth.uid())
  ));

CREATE POLICY bots_only_creator_deletes
  ON public.bots
  AS RESTRICTIVE
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = bots.league_id
      AND leagues.creator_id = (SELECT auth.uid())
  ));

-- ---------------------------------------------------------------- broken RPCs

CREATE OR REPLACE FUNCTION app_private.get_total_points_leaderboard()
RETURNS TABLE(user_id uuid, username text, total_points numeric, points_won numeric, points_lost numeric,
              leagues_played bigint, average_points_per_league numeric, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH lineup_totals AS (
    SELECT
      lineups.user_id,
      COALESCE(SUM(lineups.total_points), 0)::NUMERIC AS total_points,
      COUNT(DISTINCT lineups.league_id)::BIGINT AS leagues_played
    FROM public.lineups
    WHERE lineups.user_id IS NOT NULL
      AND COALESCE(lineups.total_points, 0) <> 0
    GROUP BY lineups.user_id
  ),
  player_game_points AS (
    SELECT
      lineups.user_id,
      CASE
        WHEN games.white = chess_players.name THEN COALESCE(games.white_points, 0)
        WHEN games.black = chess_players.name THEN COALESCE(games.black_points, 0)
        ELSE 0
      END::NUMERIC AS player_points
    FROM public.lineups
    JOIN public.chess_players
      ON chess_players.id = ANY(lineups.player_ids)
    JOIN public.games
      ON games.date = REPLACE((lineups.week_start_date + INTERVAL '1 day')::DATE::TEXT, '-', '.')
      AND (games.white = chess_players.name OR games.black = chess_players.name)
    WHERE lineups.user_id IS NOT NULL
  ),
  point_breakdown AS (
    SELECT
      player_game_points.user_id,
      COALESCE(SUM(GREATEST(player_game_points.player_points, 0)), 0)::NUMERIC AS points_won,
      COALESCE(ABS(SUM(LEAST(player_game_points.player_points, 0))), 0)::NUMERIC AS points_lost
    FROM player_game_points
    GROUP BY player_game_points.user_id
  )
  SELECT
    users.id AS user_id,
    users.username,
    lineup_totals.total_points,
    COALESCE(point_breakdown.points_won, GREATEST(lineup_totals.total_points, 0)) AS points_won,
    COALESCE(point_breakdown.points_lost, ABS(LEAST(lineup_totals.total_points, 0))) AS points_lost,
    lineup_totals.leagues_played,
    CASE
      WHEN lineup_totals.leagues_played > 0
        THEN lineup_totals.total_points / lineup_totals.leagues_played
      ELSE 0
    END AS average_points_per_league,
    users.selected_avatar_url AS avatar_url
  FROM lineup_totals
  JOIN public.users ON users.id = lineup_totals.user_id
  LEFT JOIN point_breakdown ON point_breakdown.user_id = lineup_totals.user_id
  WHERE lineup_totals.total_points <> 0
  ORDER BY lineup_totals.total_points DESC
  LIMIT 50;
END;
$function$;

-- Runs with elevated rights, so it must confirm the caller owns the league.
CREATE OR REPLACE FUNCTION app_private.delete_league_clean(league_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  league_name text;
  league_creator uuid;
  deleted_count integer;
BEGIN
  SELECT name, creator_id INTO league_name, league_creator FROM leagues WHERE id = league_uuid;

  IF league_name IS NULL THEN
    RETURN 'League not found';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM league_creator THEN
    RAISE EXCEPTION 'Only the league creator can delete this league' USING ERRCODE = '42501';
  END IF;

  DELETE FROM marketplace_turns WHERE league_id = league_uuid;
  DELETE FROM lineups WHERE league_id = league_uuid;
  DELETE FROM teams WHERE league_id = league_uuid;
  DELETE FROM bots WHERE league_id = league_uuid;
  DELETE FROM league_coin_balances WHERE league_id = league_uuid;
  DELETE FROM leagues WHERE id = league_uuid;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RETURN 'League "' || league_name || '" deleted successfully';
  END IF;
  RETURN 'Failed to delete league "' || league_name || '"';
END;
$function$;

-- ---------------------------------------------------------------- notification inbox

CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_delete_own
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Heartbeat the app sends every minute; email waits until someone has been away 30 minutes.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.users
  SET last_active_at = now()
  WHERE id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.touch_last_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
