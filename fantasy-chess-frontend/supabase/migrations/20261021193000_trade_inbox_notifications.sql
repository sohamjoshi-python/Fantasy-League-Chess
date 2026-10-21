-- Listing or completing a trade writes an inbox row for the other people in the league.
-- The person who just took the action is left out.

CREATE OR REPLACE FUNCTION public.notify_league_about_trade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  league_name text;
  player_name text;
  seller_name text;
  buyer_name text;
  member_id uuid;
  note_title text;
  note_message text;
  note_type text;
  skip_user uuid;
BEGIN
  BEGIN
    SELECT name INTO league_name FROM public.leagues WHERE id = NEW.league_id;
    SELECT name INTO player_name FROM public.chess_players WHERE id = NEW.player_id;
    SELECT COALESCE(NULLIF(username, ''), NULLIF(split_part(email, '@', 1), ''), 'A league member')
      INTO seller_name
      FROM public.users
      WHERE id = NEW.seller_id;
    seller_name := COALESCE(seller_name, 'A league member');
    player_name := COALESCE(player_name, 'A player');
    league_name := COALESCE(league_name, 'your league');

    IF TG_OP = 'INSERT' THEN
      skip_user := NEW.seller_id;
      note_type := 'trade_listed';
      note_title := player_name || ' is up for trade';
      note_message := seller_name || ' listed ' || player_name || ' in ' || league_name || ' for ' || NEW.price || ' coins.';
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
      skip_user := NEW.buyer_id;
      SELECT COALESCE(NULLIF(username, ''), NULLIF(split_part(email, '@', 1), ''), 'Another manager')
        INTO buyer_name
        FROM public.users
        WHERE id = NEW.buyer_id;
      buyer_name := COALESCE(buyer_name, 'another manager');
      note_type := 'trade_completed';
      note_title := player_name || ' was sold';
      note_message := seller_name || ' sold ' || player_name || ' to ' || buyer_name || ' in ' || league_name || ' for ' || NEW.price || ' coins.';
    ELSE
      RETURN NEW;
    END IF;

    FOR member_id IN
      SELECT u.id
      FROM public.users u
      WHERE u.id = ANY (
        SELECT unnest(COALESCE(member_ids, ARRAY[]::uuid[]))
        FROM public.leagues
        WHERE id = NEW.league_id
      )
        AND u.id IS DISTINCT FROM skip_user
        AND NOT EXISTS (SELECT 1 FROM public.bots b WHERE b.id = u.id)
    LOOP
      INSERT INTO public.notifications (user_id, league_id, title, message, type, is_read, data)
      VALUES (
        member_id,
        NEW.league_id,
        note_title,
        note_message,
        note_type,
        false,
        jsonb_build_object('link', '/league/' || NEW.league_id::text, 'tradeId', NEW.id)
      );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trade inbox notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_league_about_trade ON public.trades;

CREATE TRIGGER trg_notify_league_about_trade
  AFTER INSERT OR UPDATE OF status ON public.trades
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_league_about_trade();
