-- Manual delete commands - Run these directly in Supabase SQL editor
-- This bypasses all functions and triggers

-- First, let's see what data exists for this league
SELECT 'Checking league data...' as status;

SELECT 'Leagues:' as table_name, COUNT(*) as count FROM leagues WHERE id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Teams:', COUNT(*) FROM teams WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Lineups:', COUNT(*) FROM lineups WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'League Members:', COUNT(*) FROM league_members WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Bots:', COUNT(*) FROM bots WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Marketplace Turns:', COUNT(*) FROM marketplace_turns WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Coin Balances:', COUNT(*) FROM league_coin_balances WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid;

-- Now let's manually delete everything
-- Run these commands one by one to see which one fails

-- 1. Delete marketplace turns
DELETE FROM marketplace_turns WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid;
SELECT 'Marketplace turns deleted' as status;

-- 2. Delete lineups
DELETE FROM lineups WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid;
SELECT 'Lineups deleted' as status;

-- 3. Delete teams
DELETE FROM teams WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid;
SELECT 'Teams deleted' as status;

-- 4. Delete league members
DELETE FROM league_members WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid;
SELECT 'League members deleted' as status;

-- 5. Delete bots
DELETE FROM bots WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid;
SELECT 'Bots deleted' as status;

-- 6. Delete coin balances
DELETE FROM league_coin_balances WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid;
SELECT 'Coin balances deleted' as status;

-- 7. Finally delete the league
DELETE FROM leagues WHERE id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid;
SELECT 'League deleted' as status;

-- Verify everything is deleted
SELECT 'Verifying deletion...' as status;

SELECT 'Leagues:' as table_name, COUNT(*) as count FROM leagues WHERE id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Teams:', COUNT(*) FROM teams WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Lineups:', COUNT(*) FROM lineups WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'League Members:', COUNT(*) FROM league_members WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Bots:', COUNT(*) FROM bots WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Marketplace Turns:', COUNT(*) FROM marketplace_turns WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid
UNION ALL
SELECT 'Coin Balances:', COUNT(*) FROM league_coin_balances WHERE league_id = 'b61eafe6-5b38-4be3-8b78-83f05d6567f2'::uuid; 