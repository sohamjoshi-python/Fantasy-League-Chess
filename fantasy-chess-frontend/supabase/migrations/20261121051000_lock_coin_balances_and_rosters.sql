-- Coin balances, rosters and coin history become server-only. The browser buys and sells through
-- buy_league_player / sell_league_player (20261121040000).
--
-- Apply only after the frontend that calls those functions is live; the previous frontend wrote
-- these tables directly and its buy/sell buttons stop working once this runs.

CREATE OR REPLACE FUNCTION public.guard_coin_balance_edits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF NEW.coin_balance IS DISTINCT FROM OLD.coin_balance
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.bot_id IS DISTINCT FROM OLD.bot_id
     OR NEW.league_id IS DISTINCT FROM OLD.league_id THEN
    RAISE EXCEPTION 'Coin balances can only be changed by the game' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_coin_balance_edits
  BEFORE UPDATE ON public.league_coin_balances
  FOR EACH ROW EXECUTE FUNCTION public.guard_coin_balance_edits();

-- Browsers may drop their own players but never add any.
CREATE OR REPLACE FUNCTION public.guard_team_roster_edits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(array_length(NEW.player_ids, 1), 0) > 0 THEN
      RAISE EXCEPTION 'Players can only be added by buying them' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.bot_id IS DISTINCT FROM OLD.bot_id
     OR NEW.league_id IS DISTINCT FROM OLD.league_id THEN
    RAISE EXCEPTION 'A team cannot be moved to another owner or league' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(NEW.player_ids, ARRAY[]::uuid[])) AS p(id)
    WHERE NOT (p.id = ANY (COALESCE(OLD.player_ids, ARRAY[]::uuid[])))
  ) THEN
    RAISE EXCEPTION 'Players can only be added by buying them' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_team_roster_edits
  BEFORE INSERT OR UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.guard_team_roster_edits();

DO $grants$
BEGIN
  REVOKE ALL ON FUNCTION public.add_league_coins(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.add_league_coins(uuid, uuid, integer) TO service_role;
  REVOKE ALL ON FUNCTION app_private.add_league_coins(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION app_private.add_league_coins(uuid, uuid, integer) TO service_role;

  REVOKE INSERT, UPDATE, DELETE ON public.coin_transactions FROM anon, authenticated;

  REVOKE EXECUTE ON FUNCTION public.guard_coin_balance_edits() FROM PUBLIC, anon, authenticated;
  REVOKE EXECUTE ON FUNCTION public.guard_team_roster_edits() FROM PUBLIC, anon, authenticated;
END
$grants$;
