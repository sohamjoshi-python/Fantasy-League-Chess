-- ========================================
-- FANTASY CHESS DATABASE CLEANUP
-- Remove unused tables and columns
-- ========================================

-- WARNING: This script will permanently delete data
-- Please backup your database before running this script
-- Run this in your Supabase SQL editor

-- ========================================
-- STEP 1: REMOVE UNUSED TABLES
-- ========================================

-- Drop unused tables (these are not referenced in frontend code)
DROP TABLE IF EXISTS player_marketplace CASCADE;
DROP TABLE IF EXISTS trade_offers CASCADE;
DROP TABLE IF EXISTS star_point_transactions CASCADE;
DROP TABLE IF EXISTS standings_bonus_distributions CASCADE;
DROP TABLE IF EXISTS user_players CASCADE;

-- Note: weekly_coin_distributions is used by edge functions, so we'll keep it

-- ========================================
-- STEP 2: REMOVE UNUSED COLUMNS
-- ========================================

-- Remove unused columns from chess_players table
ALTER TABLE chess_players DROP COLUMN IF EXISTS league_owners;

-- Remove unused columns from games table
-- (All columns in games table are used by pgn_to_csv.py and frontend)

-- Remove unused columns from league_coin_balances table
-- (All columns are used by frontend)

-- Remove unused columns from league_members table
ALTER TABLE league_members DROP COLUMN IF EXISTS display_name;
ALTER TABLE league_members DROP COLUMN IF EXISTS email;

-- Remove unused columns from leagues table
ALTER TABLE leagues DROP COLUMN IF EXISTS bot_id;
ALTER TABLE leagues DROP COLUMN IF EXISTS max_players_per_team;

-- Remove unused columns from lineups table
ALTER TABLE lineups DROP COLUMN IF EXISTS week_end_date;

-- Remove unused columns from marketplace_turns table
-- (All columns are used by frontend)

-- Remove unused columns from notifications table
-- (All columns are used by frontend)

-- Remove unused columns from payouts table
-- (All columns are used by frontend)

-- Remove unused columns from teams table
-- (All columns are used by frontend)

-- Remove unused columns from users table
-- (All columns are used by frontend)

-- Remove unused columns from weekly_coin_distributions table
-- (All columns are used by edge functions)

-- ========================================
-- STEP 3: CLEAN UP UNUSED FUNCTIONS
-- ========================================

-- Drop functions that reference deleted tables
DROP FUNCTION IF EXISTS award_standings_bonus_for_league(UUID);
DROP FUNCTION IF EXISTS award_standings_bonus_points();

-- ========================================
-- STEP 4: VERIFICATION
-- ========================================

-- Show remaining tables
SELECT 
    'REMAINING_TABLES' as status,
    table_name,
    'Table' as object_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show remaining columns for each table
SELECT 
    'REMAINING_COLUMNS' as status,
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_type = 'BASE TABLE'
AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- ========================================
-- SUMMARY
-- ========================================

-- Tables removed:
-- - player_marketplace (unused marketplace system)
-- - trade_offers (unused trading system)
-- - star_point_transactions (unused star points system)
-- - standings_bonus_distributions (unused bonus system)
-- - user_players (replaced by teams table)

-- Columns removed:
-- - chess_players.league_owners (unused JSONB column)
-- - league_members.display_name (unused, using users.username instead)
-- - league_members.email (unused, using users.email instead)
-- - leagues.bot_id (unused bot reference)
-- - leagues.max_players_per_team (unused limit)
-- - lineups.week_end_date (unused, calculated from week_start_date)

-- Functions removed:
-- - award_standings_bonus_for_league (referenced deleted table)
-- - award_standings_bonus_points (referenced deleted table)

-- Tables kept (actively used by frontend):
-- - users (user management)
-- - chess_players (player data)
-- - leagues (league management)
-- - teams (user teams)
-- - lineups (weekly lineups)
-- - games (game results)
-- - bots (bot players)
-- - league_members (league membership)
-- - league_coin_balances (coin system)
-- - marketplace_turns (turn-based marketplace)
-- - notifications (inbox system)
-- - payouts (prize distribution)
-- - coin_transactions (transaction history)
-- - weekly_coin_distributions (edge function usage)
-- - avatars (avatar system)
-- - user_avatars (user avatar ownership)
-- - emails (enhanced email system)
-- - email_schedules (email scheduling)
-- - email_events (email tracking) 