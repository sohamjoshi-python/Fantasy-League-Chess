-- Members (not the creator) could mark a draft finished before it started, which blocks joins
-- and the automatic start. Same guard as 20261121040000 with that case closed.

CREATE OR REPLACE FUNCTION public.guard_league_draft_edits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  caller uuid := auth.uid();
  old_order uuid[] := COALESCE(OLD.marketplace_order, ARRAY[]::uuid[]);
  new_order uuid[] := COALESCE(NEW.marketplace_order, ARRAY[]::uuid[]);
  old_turn integer := GREATEST(COALESCE(OLD.current_marketplace_turn, 0), 0);
  new_turn integer := GREATEST(COALESCE(NEW.current_marketplace_turn, 0), 0);
  old_picker uuid;
  old_seq uuid[];
  new_seq uuid[];
BEGIN
  IF current_user <> 'authenticated' OR caller IS NOT DISTINCT FROM OLD.creator_id THEN
    RETURN NEW;
  END IF;

  IF NEW.payout_processed IS DISTINCT FROM OLD.payout_processed
     OR NEW.max_players_per_team IS DISTINCT FROM OLD.max_players_per_team
     OR NEW.marketplace_withdrawn_ids IS DISTINCT FROM OLD.marketplace_withdrawn_ids
     OR NEW.marketplace_scheduled_at IS DISTINCT FROM OLD.marketplace_scheduled_at
     OR COALESCE(NEW.marketplace_started, false) IS DISTINCT FROM COALESCE(OLD.marketplace_started, false)
     OR (COALESCE(OLD.marketplace_completed, false) AND NOT COALESCE(NEW.marketplace_completed, false))
     OR (COALESCE(OLD.draft_completed, false) AND NOT COALESCE(NEW.draft_completed, false)) THEN
    RAISE EXCEPTION 'Only the league creator can change the draft settings' USING ERRCODE = '42501';
  END IF;

  IF NOT COALESCE(OLD.marketplace_started, false) THEN
    IF new_order IS DISTINCT FROM old_order OR new_turn IS DISTINCT FROM old_turn
       OR COALESCE(NEW.marketplace_completed, false) IS DISTINCT FROM COALESCE(OLD.marketplace_completed, false)
       OR COALESCE(NEW.draft_completed, false) IS DISTINCT FROM COALESCE(OLD.draft_completed, false) THEN
      RAISE EXCEPTION 'The draft has not started yet' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF COALESCE(OLD.marketplace_completed, false) OR COALESCE(OLD.draft_completed, false) THEN
    IF new_order IS DISTINCT FROM old_order OR new_turn IS DISTINCT FROM old_turn THEN
      RAISE EXCEPTION 'The draft is already finished' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  old_picker := old_order[old_turn + 1];

  IF new_order IS NOT DISTINCT FROM old_order THEN
    IF new_turn <> old_turn THEN
      IF new_turn <> old_turn + 1
         OR NOT (
           old_picker IS NOT DISTINCT FROM caller
           OR EXISTS (SELECT 1 FROM public.bots b WHERE b.id = old_picker)
         ) THEN
        RAISE EXCEPTION 'Only the current picker can end their turn' USING ERRCODE = '42501';
      END IF;
    END IF;
  ELSIF cardinality(old_order) = 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(new_order) AS n(id)
      WHERE NOT (n.id = ANY (COALESCE(OLD.member_ids, ARRAY[]::uuid[])))
    ) OR new_turn <> 0 THEN
      RAISE EXCEPTION 'The draft order can only include league members' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Nobody may be added, reordered, or removed unless they are this member, a bot,
    -- out of coins, withdrawn, or no longer in the league.
    IF EXISTS (
      SELECT 1 FROM unnest(new_order) AS n(id)
      WHERE NOT (n.id = ANY (old_order))
    ) THEN
      RAISE EXCEPTION 'Participants cannot be added to a running draft' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM (SELECT DISTINCT o.id FROM unnest(old_order) AS o(id)) AS gone
      WHERE NOT (gone.id = ANY (new_order))
        AND gone.id IS DISTINCT FROM caller
        AND NOT EXISTS (SELECT 1 FROM public.bots b WHERE b.id = gone.id)
        AND gone.id = ANY (COALESCE(OLD.member_ids, ARRAY[]::uuid[]))
        AND NOT (gone.id = ANY (COALESCE(OLD.marketplace_withdrawn_ids, ARRAY[]::uuid[])))
        AND COALESCE((
          SELECT lcb.coin_balance FROM public.league_coin_balances lcb
          WHERE lcb.league_id = OLD.id AND lcb.user_id = gone.id
          LIMIT 1
        ), 0) > 0
    ) THEN
      RAISE EXCEPTION 'Only broke or withdrawn participants can be removed from the draft' USING ERRCODE = '42501';
    END IF;

    SELECT array_agg(s.id ORDER BY s.first_pos) INTO old_seq
    FROM (
      SELECT o.id, min(o.pos) AS first_pos
      FROM unnest(old_order) WITH ORDINALITY AS o(id, pos)
      WHERE o.id = ANY (new_order)
      GROUP BY o.id
    ) s;
    SELECT array_agg(s.id ORDER BY s.first_pos) INTO new_seq
    FROM (
      SELECT n.id, min(n.pos) AS first_pos
      FROM unnest(new_order) WITH ORDINALITY AS n(id, pos)
      GROUP BY n.id
    ) s;
    IF old_seq IS DISTINCT FROM new_seq THEN
      RAISE EXCEPTION 'The draft order cannot be rearranged' USING ERRCODE = '42501';
    END IF;

    IF old_picker IS NOT NULL AND old_picker = ANY (new_order) THEN
      IF new_order[new_turn + 1] IS DISTINCT FROM old_picker THEN
        RAISE EXCEPTION 'The current turn cannot be moved to someone else' USING ERRCODE = '42501';
      END IF;
    ELSIF new_turn > old_turn THEN
      RAISE EXCEPTION 'The current turn cannot be moved forward' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF COALESCE(NEW.marketplace_completed, false) AND NOT COALESCE(OLD.marketplace_completed, false)
     OR COALESCE(NEW.draft_completed, false) AND NOT COALESCE(OLD.draft_completed, false) THEN
    IF NOT (
      new_turn >= cardinality(new_order)
      OR (SELECT count(DISTINCT n.id) FROM unnest(new_order) AS n(id)
          WHERE NOT EXISTS (SELECT 1 FROM public.bots b WHERE b.id = n.id)) <= 1
    ) THEN
      RAISE EXCEPTION 'The draft still has picks left' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
