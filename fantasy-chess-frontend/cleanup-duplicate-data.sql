-- Clean up duplicate data and fix database issues

-- 1. First, let's see what we're dealing with
SELECT 'Current state of teams table:' as info;
SELECT user_id, league_id, COUNT(*) as count 
FROM teams 
GROUP BY user_id, league_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

SELECT 'Current state of lineups table:' as info;
SELECT user_id, league_id, week_start_date, COUNT(*) as count 
FROM lineups 
GROUP BY user_id, league_id, week_start_date 
HAVING COUNT(*) > 1
ORDER BY count DESC;

SELECT 'Current state of league_coin_balances table:' as info;
SELECT user_id, league_id, COUNT(*) as count 
FROM league_coin_balances 
GROUP BY user_id, league_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Clean up duplicate teams - keep only the most recent one for each user/league
DELETE FROM teams 
WHERE id NOT IN (
  SELECT MAX(id) 
  FROM teams 
  GROUP BY user_id, league_id
);

-- 3. Clean up duplicate lineups - keep only the most recent one for each user/league/week
DELETE FROM lineups 
WHERE id NOT IN (
  SELECT MAX(id) 
  FROM lineups 
  GROUP BY user_id, league_id, week_start_date
);

-- 4. Clean up duplicate coin balances - keep only the most recent one for each user/league
DELETE FROM league_coin_balances 
WHERE id NOT IN (
  SELECT MAX(id) 
  FROM league_coin_balances 
  GROUP BY user_id, league_id
);

-- 5. Add unique constraints to prevent future duplicates
ALTER TABLE teams ADD CONSTRAINT teams_user_league_unique UNIQUE (user_id, league_id);
ALTER TABLE lineups ADD CONSTRAINT lineups_user_league_week_unique UNIQUE (user_id, league_id, week_start_date);
ALTER TABLE league_coin_balances ADD CONSTRAINT league_coin_balances_user_league_unique UNIQUE (user_id, league_id);

-- 6. Verify the cleanup
SELECT 'After cleanup - teams table:' as info;
SELECT user_id, league_id, COUNT(*) as count 
FROM teams 
GROUP BY user_id, league_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

SELECT 'After cleanup - lineups table:' as info;
SELECT user_id, league_id, week_start_date, COUNT(*) as count 
FROM lineups 
GROUP BY user_id, league_id, week_start_date 
HAVING COUNT(*) > 1
ORDER BY count DESC;

SELECT 'After cleanup - league_coin_balances table:' as info;
SELECT user_id, league_id, COUNT(*) as count 
FROM league_coin_balances 
GROUP BY user_id, league_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 7. Ensure we have proper data for the current user
INSERT INTO teams (user_id, league_id, player_ids)
VALUES 
  ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'c94e246e-dd5e-47e4-9513-b723ae3c2e7f'::UUID, ARRAY['Hikaru', 'Firouzja2003'])
ON CONFLICT (user_id, league_id) DO UPDATE SET 
  player_ids = EXCLUDED.player_ids,
  updated_at = NOW();

INSERT INTO league_coin_balances (user_id, league_id, coin_balance)
VALUES 
  ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'c94e246e-dd5e-47e4-9513-b723ae3c2e7f'::UUID, 50)
ON CONFLICT (user_id, league_id) DO UPDATE SET 
  coin_balance = 50,
  updated_at = NOW();

INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points)
VALUES 
  ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'c94e246e-dd5e-47e4-9513-b723ae3c2e7f'::UUID, '2025-07-21'::DATE, ARRAY['Hikaru', 'Firouzja2003'], 50.00)
ON CONFLICT (user_id, league_id, week_start_date) DO UPDATE SET 
  player_ids = EXCLUDED.player_ids,
  total_points = EXCLUDED.total_points,
  updated_at = NOW(); 