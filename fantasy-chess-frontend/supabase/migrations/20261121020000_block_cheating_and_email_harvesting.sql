-- Additive security fixes. Nothing is dropped or deleted.
--
-- 1. users: a signed-in user could PATCH their own row to any coins / star_points,
--    point their email at someone else, or show any image URL as their avatar.
-- 2. lineups: a signed-in user could set total_points on their own lineup, list
--    players they do not own, or change a lineup after that week's Titled Tuesday.
-- 3. claim_*_emails returned other members' email addresses to the browser. The
--    pg_cron -> process-marketplace-turns job sends those emails server-side.
-- 4. Old scoring/test functions were executable by anonymous visitors.
-- 5. Feedback and league creation had no rate or size limits.
-- 6. email_send_log backs the per-user limits in the send-resend-email function.
--
-- Guards only act on direct API writes (current_user = 'authenticated'). SECURITY
-- DEFINER RPCs, Edge Functions (service_role) and cron jobs are unaffected.

-- ---------------------------------------------------------------- users
CREATE OR REPLACE FUNCTION public.guard_user_self_edits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  jwt_email text := NULLIF(auth.jwt() ->> 'email', '');
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.coins := LEAST(COALESCE(NEW.coins, 100), 1000);
    NEW.star_points := LEAST(COALESCE(NEW.star_points, 50), 50);
    IF jwt_email IS NOT NULL THEN
      NEW.email := jwt_email;
    END IF;
    IF length(NEW.username) > 40 THEN
      RAISE EXCEPTION 'Usernames can be at most 40 characters' USING ERRCODE = '22001';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'This field cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF NEW.coins > OLD.coins THEN
    RAISE EXCEPTION 'Coins can only be added by the game' USING ERRCODE = '42501';
  END IF;
  IF NEW.coins < 0 THEN
    RAISE EXCEPTION 'Not enough coins' USING ERRCODE = '23514';
  END IF;
  IF NEW.star_points IS DISTINCT FROM OLD.star_points THEN
    RAISE EXCEPTION 'Star points can only be changed by the game' USING ERRCODE = '42501';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email AND NEW.email IS DISTINCT FROM jwt_email THEN
    RAISE EXCEPTION 'Email can only be changed through account settings' USING ERRCODE = '42501';
  END IF;
  IF NEW.selected_avatar_url IS DISTINCT FROM OLD.selected_avatar_url
     AND NEW.selected_avatar_url IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.avatars a
       LEFT JOIN public.user_avatars ua ON ua.avatar_id = a.id AND ua.user_id = NEW.id
       WHERE a.image_url = NEW.selected_avatar_url
         AND (COALESCE(a.price, 0) = 0 OR COALESCE(ua.owned, false))
     ) THEN
    RAISE EXCEPTION 'You do not own that avatar' USING ERRCODE = '42501';
  END IF;
  IF NEW.username IS DISTINCT FROM OLD.username AND length(NEW.username) > 40 THEN
    RAISE EXCEPTION 'Usernames can be at most 40 characters' USING ERRCODE = '22001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_user_self_edits() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_guard_user_self_edits
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_self_edits();

-- ---------------------------------------------------------------- lineups
-- Bot lineups are managed by the league creator and the bot functions; only the
-- points freeze applies to them.
CREATE OR REPLACE FUNCTION public.guard_lineup_edits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  today_et date := (now() AT TIME ZONE 'America/New_York')::date;
  new_ids uuid[] := COALESCE(NEW.player_ids, ARRAY[]::uuid[]);
  old_ids uuid[] := ARRAY[]::uuid[];
  added_ids uuid[];
  team_ids uuid[];
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.total_points := CASE WHEN NEW.total_points IS NULL THEN NULL ELSE 0 END;
  ELSE
    NEW.total_points := OLD.total_points;
    old_ids := COALESCE(OLD.player_ids, ARRAY[]::uuid[]);
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.bot_id IS DISTINCT FROM OLD.bot_id
       OR NEW.league_id IS DISTINCT FROM OLD.league_id
       OR NEW.week_start_date IS DISTINCT FROM OLD.week_start_date THEN
      RAISE EXCEPTION 'A lineup cannot be moved to another week, league or owner' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.bot_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF cardinality(new_ids) > 5 THEN
    RAISE EXCEPTION 'A lineup can have at most 5 players' USING ERRCODE = '23514';
  END IF;
  IF cardinality(new_ids) <> (SELECT count(DISTINCT p.id) FROM unnest(new_ids) AS p(id)) THEN
    RAISE EXCEPTION 'A lineup cannot include the same player twice' USING ERRCODE = '23514';
  END IF;

  -- Removing players (for example after selling one) is always allowed.
  added_ids := ARRAY(SELECT unnest(new_ids) EXCEPT SELECT unnest(old_ids));
  IF cardinality(added_ids) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.week_start_date + 1 <= today_et THEN
    RAISE EXCEPTION 'Lineups for this week are locked' USING ERRCODE = '42501';
  END IF;

  SELECT t.player_ids INTO team_ids
  FROM public.teams t
  WHERE t.user_id = NEW.user_id AND t.league_id = NEW.league_id
  LIMIT 1;
  IF NOT (added_ids <@ COALESCE(team_ids, ARRAY[]::uuid[])) THEN
    RAISE EXCEPTION 'Lineups can only include players on your team' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_lineup_edits() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_guard_lineup_edits
  BEFORE INSERT OR UPDATE ON public.lineups
  FOR EACH ROW EXECUTE FUNCTION public.guard_lineup_edits();

-- ---------------------------------------------------------------- leagues
CREATE OR REPLACE FUNCTION public.guard_league_size_and_rate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF length(NEW.name) > 80 THEN
    RAISE EXCEPTION 'League names can be at most 80 characters' USING ERRCODE = '22001';
  END IF;
  IF length(NEW.description) > 1000 THEN
    RAISE EXCEPTION 'League descriptions can be at most 1000 characters' USING ERRCODE = '22001';
  END IF;
  IF TG_OP = 'INSERT' AND (
    SELECT count(*) FROM public.leagues l
    WHERE l.creator_id = NEW.creator_id AND l.created_at > now() - interval '24 hours'
  ) >= 10 THEN
    RAISE EXCEPTION 'You can create at most 10 leagues per day' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_league_size_and_rate() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_guard_league_size_and_rate
  BEFORE INSERT OR UPDATE ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION public.guard_league_size_and_rate();

-- ---------------------------------------------------------------- feedback
-- SECURITY DEFINER so it can count rows the caller cannot read; auth.role() tells
-- browser inserts apart from server ones.
CREATE OR REPLACE FUNCTION public.guard_feedback_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recent integer;
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    SELECT count(*) INTO recent FROM public.feedback_reports
    WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour';
    IF recent >= 5 THEN
      RAISE EXCEPTION 'Too many reports. Please try again later.' USING ERRCODE = '54000';
    END IF;
  ELSE
    SELECT count(*) INTO recent FROM public.feedback_reports
    WHERE user_id IS NULL AND created_at > now() - interval '1 hour';
    IF recent >= 10 THEN
      RAISE EXCEPTION 'Too many reports. Please try again later.' USING ERRCODE = '54000';
    END IF;
  END IF;

  NEW.status := 'new';
  NEW.contact_email := left(NEW.contact_email, 254);
  NEW.liked := left(NEW.liked, 4000);
  NEW.confused := left(NEW.confused, 4000);
  NEW.feature_request := left(NEW.feature_request, 4000);
  NEW.message := left(NEW.message, 4000);
  NEW.bug_title := left(NEW.bug_title, 300);
  NEW.bug_severity := left(NEW.bug_severity, 40);
  NEW.page_url := left(NEW.page_url, 1000);
  NEW.steps_to_reproduce := left(NEW.steps_to_reproduce, 4000);
  NEW.expected_behavior := left(NEW.expected_behavior, 4000);
  NEW.actual_behavior := left(NEW.actual_behavior, 4000);
  NEW.user_agent := left(NEW.user_agent, 500);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_feedback_reports() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_guard_feedback_reports
  BEFORE INSERT ON public.feedback_reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_feedback_reports();

-- ---------------------------------------------------------------- email send log
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL,
  caller_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_send_log_kind_caller_created_idx
  ON public.email_send_log (kind, caller_id, created_at DESC);
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_send_log FROM anon, authenticated;
GRANT SELECT, INSERT ON public.email_send_log TO service_role;

-- ---------------------------------------------------------------- function privileges
DO $grants$
DECLARE
  fn record;
BEGIN
  -- Server-only: these return members' email addresses.
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace IN ('public'::regnamespace, 'app_private'::regnamespace)
      AND p.proname IN ('claim_league_lifecycle_emails', 'claim_marketplace_turn_emails')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;

  -- Server-only: old scoring and test functions.
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('process_weekly_results', 'process_weekly_results_fixed', 'process_weekly_results_working',
                        'test_simple_weekly_results', 'debug_weekly_results')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;

  -- Signed-in users only (auto_set_bot_lineup runs from a trigger on the creator's insert).
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('auto_set_bot_lineup', 'start_marketplace', 'update_league_discord_info')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn.sig);
  END LOOP;
END
$grants$;

GRANT USAGE ON SCHEMA app_private TO service_role;
