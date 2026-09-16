-- Revert the one-time standings-bonus backfill.
--
-- The first successful run of award_standings_bonus_points() retroactively awarded
-- a standings bonus to EVERY previously-ended, paid-out league (many ended months
-- ago). This script undoes that batch:
--   1. Subtracts the awarded coins back out of users.coins.
--   2. Deletes the 'standings_bonus' coin_transactions rows.
--   3. Clears standings_bonus_distributions so the (now windowed) weekly job is
--      unaffected going forward.
--
-- Safe to run once. It is self-cleaning: because it deletes the transactions it
-- reverses, re-running it will find nothing left to undo (no double subtraction).
--
-- NOTE: This reverses ALL 'standings_bonus' transactions. That is correct here
-- because the backfill was the only standings-bonus distribution that has ever run.
-- If you later award legitimate bonuses and only want to undo a subset, scope the
-- statements below by created_at or league_id instead.

BEGIN;

-- 1. Reverse the coin awards (clamp at 0 to avoid negative balances).
UPDATE users u
SET coins = GREATEST(COALESCE(u.coins, 0) - agg.total, 0),
    updated_at = NOW()
FROM (
    SELECT user_id, SUM(amount) AS total
    FROM coin_transactions
    WHERE transaction_type = 'standings_bonus'
      AND user_id IS NOT NULL
    GROUP BY user_id
) agg
WHERE u.id = agg.user_id;

-- 2. Remove the standings-bonus transaction records.
DELETE FROM coin_transactions
WHERE transaction_type = 'standings_bonus';

-- 3. Clear the distribution log so future runs re-evaluate cleanly.
DELETE FROM standings_bonus_distributions;

COMMIT;

-- Verification (should all return 0 rows / 0 counts):
SELECT COUNT(*) AS remaining_standings_bonus_txns
FROM coin_transactions
WHERE transaction_type = 'standings_bonus';

SELECT COUNT(*) AS remaining_distributions
FROM standings_bonus_distributions;
