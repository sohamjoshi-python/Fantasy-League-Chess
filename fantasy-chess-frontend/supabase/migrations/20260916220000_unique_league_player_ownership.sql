-- Ensure a chess player can be owned by only one team in a league.
-- Client buy flows were read-then-write, so two managers could claim the same
-- player after a stale reload. Unique claims plus a teams trigger close that race.

CREATE TABLE IF NOT EXISTS public.league_player_ownership (
    league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    player_id uuid NOT NULL REFERENCES public.chess_players(id) ON DELETE CASCADE,
    PRIMARY KEY (league_id, player_id)
);

CREATE INDEX IF NOT EXISTS league_player_ownership_player_idx
    ON public.league_player_ownership (player_id);

-- Drop duplicate copies of a player from extra teams, then backfill claims.
WITH exploded AS (
    SELECT
        t.id AS team_id,
        t.league_id,
        t.user_id,
        t.bot_id,
        player_id,
        ROW_NUMBER() OVER (
            PARTITION BY t.league_id, player_id
            ORDER BY t.created_at NULLS LAST, t.id
        ) AS rn
    FROM public.teams t
    CROSS JOIN LATERAL unnest(COALESCE(t.player_ids, ARRAY[]::uuid[])) AS player_id
),
dupes AS (
    SELECT team_id, player_id
    FROM exploded
    WHERE rn > 1
)
UPDATE public.teams t
SET player_ids = ARRAY(
        SELECT kept.player_id
        FROM unnest(COALESCE(t.player_ids, ARRAY[]::uuid[])) AS kept(player_id)
        WHERE NOT EXISTS (
            SELECT 1
            FROM dupes d
            WHERE d.team_id = t.id
              AND d.player_id = kept.player_id
        )
    )
WHERE EXISTS (
    SELECT 1
    FROM dupes d
    WHERE d.team_id = t.id
);

-- Remove duplicate players from those users'/bots' lineups in the same league.
WITH exploded AS (
    SELECT
        t.league_id,
        t.user_id,
        t.bot_id,
        player_id
    FROM public.teams t
    CROSS JOIN LATERAL unnest(COALESCE(t.player_ids, ARRAY[]::uuid[])) AS player_id
)
UPDATE public.lineups l
SET player_ids = ARRAY(
        SELECT kept.player_id
        FROM unnest(COALESCE(l.player_ids, ARRAY[]::uuid[])) AS kept(player_id)
        WHERE EXISTS (
            SELECT 1
            FROM exploded e
            WHERE e.league_id = l.league_id
              AND e.player_id = kept.player_id
              AND (
                  (l.user_id IS NOT NULL AND e.user_id = l.user_id)
                  OR (l.bot_id IS NOT NULL AND e.bot_id = l.bot_id)
              )
        )
    )
WHERE EXISTS (
    SELECT 1
    FROM unnest(COALESCE(l.player_ids, ARRAY[]::uuid[])) AS listed(player_id)
    WHERE NOT EXISTS (
        SELECT 1
        FROM exploded e
        WHERE e.league_id = l.league_id
          AND e.player_id = listed.player_id
          AND (
              (l.user_id IS NOT NULL AND e.user_id = l.user_id)
              OR (l.bot_id IS NOT NULL AND e.bot_id = l.bot_id)
          )
    )
);

INSERT INTO public.league_player_ownership (league_id, player_id)
SELECT DISTINCT t.league_id, player_id
FROM public.teams t
JOIN public.leagues l ON l.id = t.league_id
CROSS JOIN LATERAL unnest(COALESCE(t.player_ids, ARRAY[]::uuid[])) AS player_id
WHERE player_id IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM public.chess_players cp
      WHERE cp.id = player_id
  )
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_league_player_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_ids uuid[] := ARRAY[]::uuid[];
    new_ids uuid[] := ARRAY[]::uuid[];
    added uuid;
    removed uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.league_player_ownership
        WHERE league_id = OLD.league_id
          AND player_id = ANY(COALESCE(OLD.player_ids, ARRAY[]::uuid[]));
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        old_ids := COALESCE(OLD.player_ids, ARRAY[]::uuid[]);
    END IF;
    new_ids := COALESCE(NEW.player_ids, ARRAY[]::uuid[]);

    IF (
        SELECT COUNT(*) FROM unnest(new_ids) AS p(id)
    ) <> (
        SELECT COUNT(DISTINCT p.id) FROM unnest(new_ids) AS p(id)
    ) THEN
        RAISE EXCEPTION 'A team cannot contain the same player twice';
    END IF;

    FOR removed IN
        SELECT unnest(old_ids)
        EXCEPT
        SELECT unnest(new_ids)
    LOOP
        DELETE FROM public.league_player_ownership
        WHERE league_id = NEW.league_id
          AND player_id = removed;
    END LOOP;

    FOR added IN
        SELECT unnest(new_ids)
        EXCEPT
        SELECT unnest(old_ids)
    LOOP
        IF added IS NULL THEN
            CONTINUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = NEW.league_id) THEN
            CONTINUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.chess_players WHERE id = added) THEN
            CONTINUE;
        END IF;
        INSERT INTO public.league_player_ownership (league_id, player_id)
        VALUES (NEW.league_id, added);
    END LOOP;

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'This player is already owned in this league';
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_league_player_ownership ON public.teams;
CREATE TRIGGER trg_sync_league_player_ownership
    BEFORE INSERT OR UPDATE OF player_ids OR DELETE
    ON public.teams
    FOR EACH ROW
    EXECUTE PROCEDURE public.sync_league_player_ownership();

ALTER TABLE public.league_player_ownership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS league_player_ownership_select ON public.league_player_ownership;
CREATE POLICY league_player_ownership_select
    ON public.league_player_ownership
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.leagues l
            WHERE l.id = league_id
              AND (
                  auth.uid() = l.creator_id
                  OR auth.uid() = ANY(COALESCE(l.member_ids, ARRAY[]::uuid[]))
              )
        )
    );

GRANT SELECT ON public.league_player_ownership TO authenticated;
GRANT ALL ON public.league_player_ownership TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.league_player_ownership;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
