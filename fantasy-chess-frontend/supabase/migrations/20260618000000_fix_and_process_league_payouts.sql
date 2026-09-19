-- Ensure ended league payouts use the current users.coins balance column,
-- then process any leagues that have ended and are still pending payout.

CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payouts'
      AND column_name = 'rank'
  ) THEN
    ALTER TABLE public.payouts
    ADD COLUMN rank INTEGER NOT NULL DEFAULT 1;
  ELSE
    ALTER TABLE public.payouts
    ALTER COLUMN rank SET DEFAULT 1;
  END IF;
END $$;

-- Some older league data has auth user IDs in lineups/member_ids but is missing
-- the matching app profile row. Payouts reference public.users, so backfill those
-- profiles from auth.users before choosing winners.
INSERT INTO public.users (id, email, username, coins, created_at, updated_at)
SELECT DISTINCT
  auth_users.id,
  COALESCE(auth_users.email, auth_users.id::TEXT || '@missing-email.local'),
  LEFT(
    COALESCE(
      auth_users.raw_user_meta_data->>'username',
      auth_users.raw_user_meta_data->>'display_name',
      split_part(COALESCE(auth_users.email, auth_users.id::TEXT), '@', 1)
    ) || '_' || LEFT(auth_users.id::TEXT, 8),
    255
  ),
  100,
  COALESCE(auth_users.created_at, NOW()),
  NOW()
FROM auth.users AS auth_users
WHERE auth_users.id IN (
    SELECT creator_id
    FROM public.leagues
    WHERE end_date < CURRENT_DATE
      AND COALESCE(payout_processed, false) = false
      AND creator_id IS NOT NULL

    UNION

    SELECT UNNEST(member_ids)
    FROM public.leagues
    WHERE end_date < CURRENT_DATE
      AND COALESCE(payout_processed, false) = false
      AND member_ids IS NOT NULL

    UNION

    SELECT user_id
    FROM public.lineups
    WHERE user_id IS NOT NULL
      AND league_id IN (
        SELECT id
        FROM public.leagues
        WHERE end_date < CURRENT_DATE
          AND COALESCE(payout_processed, false) = false
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth_users.id
  )
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.process_league_payouts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  league_row RECORD;
  winner_id UUID;
  prize_amount INTEGER;
  payout_already_exists BOOLEAN;
BEGIN
  FOR league_row IN
    SELECT *
    FROM public.leagues
    WHERE end_date < CURRENT_DATE
      AND COALESCE(payout_processed, false) = false
  LOOP
    SELECT lineups.user_id
    INTO winner_id
    FROM public.lineups
    JOIN public.users ON users.id = lineups.user_id
    WHERE lineups.league_id = league_row.id
      AND lineups.user_id IS NOT NULL
    GROUP BY lineups.user_id
    ORDER BY SUM(COALESCE(lineups.total_points, 0)) DESC
    LIMIT 1;

    IF winner_id IS NULL THEN
      CONTINUE;
    END IF;

    prize_amount := COALESCE(league_row.buy_in, 0)::INTEGER * COALESCE(cardinality(league_row.member_ids), 0);

    SELECT EXISTS (
      SELECT 1
      FROM public.payouts
      WHERE payouts.league_id = league_row.id
    ) INTO payout_already_exists;

    IF payout_already_exists THEN
      UPDATE public.leagues
      SET
        payout_processed = true,
        updated_at = NOW()
      WHERE id = league_row.id;

      CONTINUE;
    END IF;

    INSERT INTO public.payouts (league_id, user_id, amount, rank)
    VALUES (league_row.id, winner_id, prize_amount, 1);

    UPDATE public.users
    SET
      coins = COALESCE(coins, 0) + prize_amount,
      updated_at = NOW()
    WHERE id = winner_id;

    UPDATE public.leagues
    SET
      payout_processed = true,
      updated_at = NOW()
    WHERE id = league_row.id;
  END LOOP;
END;
$$;

SELECT public.process_league_payouts();
