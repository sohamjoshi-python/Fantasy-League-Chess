-- ==========================================
-- POPULATE LEADERBOARD WITH SAMPLE DATA
-- Creates demo users in auth.users AND public.users
-- Low scores to make it easy for real users to beat
-- ==========================================

-- First, drop existing functions if they exist
DROP FUNCTION IF EXISTS get_league_wins_leaderboard();
DROP FUNCTION IF EXISTS get_total_points_leaderboard();
DROP FUNCTION IF EXISTS get_recent_winners();
DROP FUNCTION IF EXISTS get_weekly_top_performers(DATE);

-- Create the leaderboard RPC functions
-- ==========================================

-- Function 1: Get League Wins Leaderboard
-- Note: Calculates wins by finding user with highest total points in each completed league
CREATE FUNCTION get_league_wins_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  wins BIGINT,
  total_leagues BIGINT,
  total_prize_money NUMERIC,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_league_totals AS (
    SELECT 
      ln.league_id,
      ln.user_id,
      l.buy_in,
      l.member_ids,
      SUM(ln.total_points) as total_points
    FROM lineups ln
    JOIN leagues l ON ln.league_id = l.id
    WHERE l.end_date < CURRENT_DATE
    GROUP BY ln.league_id, ln.user_id, l.buy_in, l.member_ids
  ),
  league_winners AS (
    SELECT DISTINCT ON (league_id)
      league_id,
      user_id as winner_id,
      buy_in * COALESCE(array_length(member_ids, 1), 0) as prize
    FROM user_league_totals
    ORDER BY league_id, total_points DESC
  )
  SELECT 
    u.id as user_id,
    u.username,
    COUNT(DISTINCT lw.league_id) as wins,
    COUNT(DISTINCT CASE WHEN u.id = ANY(l.member_ids) THEN l.id END) as total_leagues,
    COALESCE(SUM(lw.prize), 0) as total_prize_money,
    u.avatar_url
  FROM users u
  INNER JOIN league_winners lw ON u.id = lw.winner_id
  LEFT JOIN leagues l ON u.id = ANY(l.member_ids) AND l.end_date < CURRENT_DATE
  GROUP BY u.id, u.username, u.avatar_url
  HAVING COUNT(DISTINCT lw.league_id) > 0
  ORDER BY wins DESC, total_prize_money DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get Total Points Leaderboard
CREATE FUNCTION get_total_points_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_points NUMERIC,
  leagues_played BIGINT,
  average_points_per_league NUMERIC,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    COALESCE(SUM(ln.total_points), 0) as total_points,
    COUNT(DISTINCT ln.league_id) as leagues_played,
    CASE 
      WHEN COUNT(DISTINCT ln.league_id) > 0 
      THEN COALESCE(SUM(ln.total_points), 0) / COUNT(DISTINCT ln.league_id)
      ELSE 0 
    END as average_points_per_league,
    u.avatar_url
  FROM users u
  LEFT JOIN lineups ln ON u.id = ln.user_id
  WHERE ln.total_points > 0
  GROUP BY u.id, u.username, u.avatar_url
  HAVING COALESCE(SUM(ln.total_points), 0) > 0
  ORDER BY total_points DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get Recent Winners (Last 30 Days)
-- Calculates winners based on highest total points in each league
CREATE FUNCTION get_recent_winners()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  league_name TEXT,
  prize_amount NUMERIC,
  won_date DATE,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH league_winners AS (
    SELECT DISTINCT ON (ln.league_id)
      ln.league_id,
      ln.user_id as winner_id,
      SUM(ln.total_points) as total_points
    FROM lineups ln
    JOIN leagues l ON ln.league_id = l.id
    WHERE l.end_date >= CURRENT_DATE - INTERVAL '30 days'
      AND l.end_date < CURRENT_DATE
    GROUP BY ln.league_id, ln.user_id
    ORDER BY ln.league_id, SUM(ln.total_points) DESC
  )
  SELECT 
    u.id as user_id,
    u.username,
    l.name as league_name,
    (l.buy_in * COALESCE(array_length(l.member_ids, 1), 0))::NUMERIC as prize_amount,
    l.end_date as won_date,
    u.avatar_url
  FROM league_winners lw
  JOIN users u ON lw.winner_id = u.id
  JOIN leagues l ON lw.league_id = l.id
  ORDER BY l.end_date DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Get Weekly Top Performers
CREATE FUNCTION get_weekly_top_performers(week_date DATE)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  league_name TEXT,
  week_points NUMERIC,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    l.name as league_name,
    ln.total_points as week_points,
    u.avatar_url
  FROM lineups ln
  JOIN users u ON ln.user_id = u.id
  JOIN leagues l ON ln.league_id = l.id
  WHERE ln.week_start_date = week_date
    AND ln.total_points > 0
  ORDER BY ln.total_points DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_league_wins_leaderboard() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_total_points_leaderboard() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_recent_winners() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_weekly_top_performers(DATE) TO authenticated, anon;

-- ==========================================
-- Insert sample data with pre-generated UUIDs
-- ==========================================

DO $$
DECLARE
  -- Pre-generate UUIDs for demo users
  demo_user_1_id UUID := '11111111-1111-1111-1111-111111111111';
  demo_user_2_id UUID := '22222222-2222-2222-2222-222222222222';
  demo_user_3_id UUID := '33333333-3333-3333-3333-333333333333';
  demo_user_4_id UUID := '44444444-4444-4444-4444-444444444444';
  demo_user_5_id UUID := '55555555-5555-5555-5555-555555555555';
  demo_user_6_id UUID := '66666666-6666-6666-6666-666666666666';
  demo_user_7_id UUID := '77777777-7777-7777-7777-777777777777';
  demo_user_8_id UUID := '88888888-8888-8888-8888-888888888888';
  
  demo_league_1_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  demo_league_2_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  demo_league_3_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  demo_league_4_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
BEGIN
  -- Step 1: Insert into auth.users (Supabase auth table)
  INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  )
  VALUES 
    (demo_user_1_id, 'chessdemo1@fantasyleaguechess.app', crypt('DemoPass123!', gen_salt('bf')), NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', '{"provider":"email","providers":["email"]}', '{"username":"ChessNovice"}', false, 'authenticated'),
    (demo_user_2_id, 'chessdemo2@fantasyleaguechess.app', crypt('DemoPass123!', gen_salt('bf')), NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days', '{"provider":"email","providers":["email"]}', '{"username":"PawnPusher"}', false, 'authenticated'),
    (demo_user_3_id, 'chessdemo3@fantasyleaguechess.app', crypt('DemoPass123!', gen_salt('bf')), NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days', '{"provider":"email","providers":["email"]}', '{"username":"RookiePlayer"}', false, 'authenticated'),
    (demo_user_4_id, 'chessdemo4@fantasyleaguechess.app', crypt('DemoPass123!', gen_salt('bf')), NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', '{"provider":"email","providers":["email"]}', '{"username":"CasualGamer"}', false, 'authenticated'),
    (demo_user_5_id, 'chessdemo5@fantasyleaguechess.app', crypt('DemoPass123!', gen_salt('bf')), NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', '{"provider":"email","providers":["email"]}', '{"username":"Beginner99"}', false, 'authenticated'),
    (demo_user_6_id, 'chessdemo6@fantasyleaguechess.app', crypt('DemoPass123!', gen_salt('bf')), NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', '{"provider":"email","providers":["email"]}', '{"username":"FirstTimer"}', false, 'authenticated'),
    (demo_user_7_id, 'chessdemo7@fantasyleaguechess.app', crypt('DemoPass123!', gen_salt('bf')), NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', '{"provider":"email","providers":["email"]}', '{"username":"LearningChess"}', false, 'authenticated'),
    (demo_user_8_id, 'chessdemo8@fantasyleaguechess.app', crypt('DemoPass123!', gen_salt('bf')), NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', '{"provider":"email","providers":["email"]}', '{"username":"TryingMyBest"}', false, 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- Step 2: Insert into public.users (your app's users table)
  INSERT INTO users (id, username, email, created_at)
  VALUES 
    (demo_user_1_id, 'ChessNovice', 'chessdemo1@fantasyleaguechess.app', NOW() - INTERVAL '60 days'),
    (demo_user_2_id, 'PawnPusher', 'chessdemo2@fantasyleaguechess.app', NOW() - INTERVAL '55 days'),
    (demo_user_3_id, 'RookiePlayer', 'chessdemo3@fantasyleaguechess.app', NOW() - INTERVAL '50 days'),
    (demo_user_4_id, 'CasualGamer', 'chessdemo4@fantasyleaguechess.app', NOW() - INTERVAL '45 days'),
    (demo_user_5_id, 'Beginner99', 'chessdemo5@fantasyleaguechess.app', NOW() - INTERVAL '40 days'),
    (demo_user_6_id, 'FirstTimer', 'chessdemo6@fantasyleaguechess.app', NOW() - INTERVAL '35 days'),
    (demo_user_7_id, 'LearningChess', 'chessdemo7@fantasyleaguechess.app', NOW() - INTERVAL '30 days'),
    (demo_user_8_id, 'TryingMyBest', 'chessdemo8@fantasyleaguechess.app', NOW() - INTERVAL '25 days')
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;

  -- Step 3: Insert demo leagues (past leagues with low scores)
  INSERT INTO leagues (
    id, name, start_date, end_date, buy_in, is_public, join_code,
    creator_id, member_ids, draft_order, current_draft_turn,
    draft_completed, marketplace_completed, payout_processed,
    created_at
  )
  VALUES 
    (demo_league_1_id, 'Beginner League Alpha', (CURRENT_DATE - INTERVAL '38 days')::DATE, (CURRENT_DATE - INTERVAL '10 days')::DATE, 5.00, false, 'DEMO1', demo_user_1_id, ARRAY[demo_user_1_id, demo_user_2_id, demo_user_3_id, demo_user_4_id], ARRAY[demo_user_1_id, demo_user_2_id, demo_user_3_id, demo_user_4_id], 0, true, true, false, NOW() - INTERVAL '38 days'),
    (demo_league_2_id, 'Starter Cup', (CURRENT_DATE - INTERVAL '43 days')::DATE, (CURRENT_DATE - INTERVAL '15 days')::DATE, 10.00, false, 'DEMO2', demo_user_2_id, ARRAY[demo_user_2_id, demo_user_3_id, demo_user_4_id, demo_user_5_id, demo_user_6_id, demo_user_7_id], ARRAY[demo_user_2_id, demo_user_3_id, demo_user_4_id, demo_user_5_id, demo_user_6_id, demo_user_7_id], 0, true, true, false, NOW() - INTERVAL '43 days'),
    (demo_league_3_id, 'Casual Players League', (CURRENT_DATE - INTERVAL '48 days')::DATE, (CURRENT_DATE - INTERVAL '20 days')::DATE, 5.00, false, 'DEMO3', demo_user_1_id, ARRAY[demo_user_1_id, demo_user_5_id, demo_user_6_id, demo_user_8_id], ARRAY[demo_user_1_id, demo_user_5_id, demo_user_6_id, demo_user_8_id], 0, true, true, false, NOW() - INTERVAL '48 days'),
    (demo_league_4_id, 'First Timers Tournament', (CURRENT_DATE - INTERVAL '53 days')::DATE, (CURRENT_DATE - INTERVAL '25 days')::DATE, 10.00, false, 'DEMO4', demo_user_4_id, ARRAY[demo_user_4_id, demo_user_6_id, demo_user_7_id, demo_user_8_id], ARRAY[demo_user_4_id, demo_user_6_id, demo_user_7_id, demo_user_8_id], 0, true, true, false, NOW() - INTERVAL '53 days')
  ON CONFLICT (id) DO NOTHING;

  -- Step 4: Insert lineups with LOW SCORES (7-23 points per week)
  -- League 1 lineups (4 weeks, 4 users)
  INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
  VALUES
    -- Week 1
    (demo_user_1_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '38 days')::DATE, '{}', 12.5, NOW() - INTERVAL '38 days', NOW() - INTERVAL '31 days'),
    (demo_user_2_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '38 days')::DATE, '{}', 8.3, NOW() - INTERVAL '38 days', NOW() - INTERVAL '31 days'),
    (demo_user_3_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '38 days')::DATE, '{}', 10.7, NOW() - INTERVAL '38 days', NOW() - INTERVAL '31 days'),
    (demo_user_4_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '38 days')::DATE, '{}', 7.2, NOW() - INTERVAL '38 days', NOW() - INTERVAL '31 days'),
    -- Week 2
    (demo_user_1_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '31 days')::DATE, '{}', 15.8, NOW() - INTERVAL '31 days', NOW() - INTERVAL '24 days'),
    (demo_user_2_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '31 days')::DATE, '{}', 11.2, NOW() - INTERVAL '31 days', NOW() - INTERVAL '24 days'),
    (demo_user_3_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '31 days')::DATE, '{}', 9.5, NOW() - INTERVAL '31 days', NOW() - INTERVAL '24 days'),
    (demo_user_4_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '31 days')::DATE, '{}', 13.1, NOW() - INTERVAL '31 days', NOW() - INTERVAL '24 days'),
    -- Week 3
    (demo_user_1_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '24 days')::DATE, '{}', 18.4, NOW() - INTERVAL '24 days', NOW() - INTERVAL '17 days'),
    (demo_user_2_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '24 days')::DATE, '{}', 14.6, NOW() - INTERVAL '24 days', NOW() - INTERVAL '17 days'),
    (demo_user_3_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '24 days')::DATE, '{}', 12.3, NOW() - INTERVAL '24 days', NOW() - INTERVAL '17 days'),
    (demo_user_4_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '24 days')::DATE, '{}', 16.0, NOW() - INTERVAL '24 days', NOW() - INTERVAL '17 days'),
    -- Week 4
    (demo_user_1_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '17 days')::DATE, '{}', 20.1, NOW() - INTERVAL '17 days', NOW() - INTERVAL '10 days'),
    (demo_user_2_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '17 days')::DATE, '{}', 9.8, NOW() - INTERVAL '17 days', NOW() - INTERVAL '10 days'),
    (demo_user_3_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '17 days')::DATE, '{}', 11.9, NOW() - INTERVAL '17 days', NOW() - INTERVAL '10 days'),
    (demo_user_4_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '17 days')::DATE, '{}', 15.5, NOW() - INTERVAL '17 days', NOW() - INTERVAL '10 days'),
    
    -- League 2 lineups (4 weeks, 6 users)
    (demo_user_2_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 11.2, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_3_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 16.5, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_4_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 8.7, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_5_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 13.4, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_6_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 10.9, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_7_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 14.3, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    
    (demo_user_2_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 13.8, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_3_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 19.2, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_4_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 12.1, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_5_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 15.7, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_6_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 11.5, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_7_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 16.8, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    
    (demo_user_2_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 10.4, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_3_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 21.3, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_4_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 9.6, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_5_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 14.2, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_6_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 12.7, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_7_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 17.9, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    
    (demo_user_2_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 12.9, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_3_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 22.8, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_4_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 11.3, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_5_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 16.1, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_6_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 13.8, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_7_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 18.5, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    
    -- League 3 & 4 lineups (simpler scores)
    (demo_user_1_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '48 days')::DATE, '{}', 9.5, NOW() - INTERVAL '48 days', NOW() - INTERVAL '41 days'),
    (demo_user_5_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '48 days')::DATE, '{}', 14.2, NOW() - INTERVAL '48 days', NOW() - INTERVAL '41 days'),
    (demo_user_6_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '48 days')::DATE, '{}', 11.7, NOW() - INTERVAL '48 days', NOW() - INTERVAL '41 days'),
    (demo_user_8_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '48 days')::DATE, '{}', 8.3, NOW() - INTERVAL '48 days', NOW() - INTERVAL '41 days'),
    
    (demo_user_1_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '41 days')::DATE, '{}', 10.8, NOW() - INTERVAL '41 days', NOW() - INTERVAL '34 days'),
    (demo_user_5_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '41 days')::DATE, '{}', 16.9, NOW() - INTERVAL '41 days', NOW() - INTERVAL '34 days'),
    (demo_user_6_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '41 days')::DATE, '{}', 13.2, NOW() - INTERVAL '41 days', NOW() - INTERVAL '34 days'),
    (demo_user_8_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '41 days')::DATE, '{}', 9.1, NOW() - INTERVAL '41 days', NOW() - INTERVAL '34 days'),
    
    (demo_user_1_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '34 days')::DATE, '{}', 12.3, NOW() - INTERVAL '34 days', NOW() - INTERVAL '27 days'),
    (demo_user_5_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '34 days')::DATE, '{}', 18.5, NOW() - INTERVAL '34 days', NOW() - INTERVAL '27 days'),
    (demo_user_6_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '34 days')::DATE, '{}', 14.6, NOW() - INTERVAL '34 days', NOW() - INTERVAL '27 days'),
    (demo_user_8_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '34 days')::DATE, '{}', 10.7, NOW() - INTERVAL '34 days', NOW() - INTERVAL '27 days'),
    
    (demo_user_1_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '27 days')::DATE, '{}', 11.1, NOW() - INTERVAL '27 days', NOW() - INTERVAL '20 days'),
    (demo_user_5_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '27 days')::DATE, '{}', 19.8, NOW() - INTERVAL '27 days', NOW() - INTERVAL '20 days'),
    (demo_user_6_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '27 days')::DATE, '{}', 15.4, NOW() - INTERVAL '27 days', NOW() - INTERVAL '20 days'),
    (demo_user_8_id, demo_league_3_id, (CURRENT_DATE - INTERVAL '27 days')::DATE, '{}', 12.2, NOW() - INTERVAL '27 days', NOW() - INTERVAL '20 days'),
    
    (demo_user_4_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '53 days')::DATE, '{}', 8.9, NOW() - INTERVAL '53 days', NOW() - INTERVAL '46 days'),
    (demo_user_6_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '53 days')::DATE, '{}', 12.4, NOW() - INTERVAL '53 days', NOW() - INTERVAL '46 days'),
    (demo_user_7_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '53 days')::DATE, '{}', 15.7, NOW() - INTERVAL '53 days', NOW() - INTERVAL '46 days'),
    (demo_user_8_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '53 days')::DATE, '{}', 10.2, NOW() - INTERVAL '53 days', NOW() - INTERVAL '46 days'),
    
    (demo_user_4_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '46 days')::DATE, '{}', 11.5, NOW() - INTERVAL '46 days', NOW() - INTERVAL '39 days'),
    (demo_user_6_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '46 days')::DATE, '{}', 13.8, NOW() - INTERVAL '46 days', NOW() - INTERVAL '39 days'),
    (demo_user_7_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '46 days')::DATE, '{}', 17.3, NOW() - INTERVAL '46 days', NOW() - INTERVAL '39 days'),
    (demo_user_8_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '46 days')::DATE, '{}', 9.6, NOW() - INTERVAL '46 days', NOW() - INTERVAL '39 days'),
    
    (demo_user_4_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '39 days')::DATE, '{}', 13.2, NOW() - INTERVAL '39 days', NOW() - INTERVAL '32 days'),
    (demo_user_6_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '39 days')::DATE, '{}', 15.1, NOW() - INTERVAL '39 days', NOW() - INTERVAL '32 days'),
    (demo_user_7_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '39 days')::DATE, '{}', 19.8, NOW() - INTERVAL '39 days', NOW() - INTERVAL '32 days'),
    (demo_user_8_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '39 days')::DATE, '{}', 11.4, NOW() - INTERVAL '39 days', NOW() - INTERVAL '32 days'),
    
    (demo_user_4_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '32 days')::DATE, '{}', 14.7, NOW() - INTERVAL '32 days', NOW() - INTERVAL '25 days'),
    (demo_user_6_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '32 days')::DATE, '{}', 16.9, NOW() - INTERVAL '32 days', NOW() - INTERVAL '25 days'),
    (demo_user_7_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '32 days')::DATE, '{}', 21.4, NOW() - INTERVAL '32 days', NOW() - INTERVAL '25 days'),
    (demo_user_8_id, demo_league_4_id, (CURRENT_DATE - INTERVAL '32 days')::DATE, '{}', 13.1, NOW() - INTERVAL '32 days', NOW() - INTERVAL '25 days')
  ON CONFLICT (user_id, league_id, week_start_date) DO NOTHING;
  
  RAISE NOTICE '✅ Sample leaderboard data populated successfully!';
  RAISE NOTICE '📊 Demo users: ChessNovice, PawnPusher, RookiePlayer, CasualGamer, Beginner99, FirstTimer, LearningChess, TryingMyBest';
  RAISE NOTICE '🎯 All scores are low (7-23 points per week) - easy for real users to beat!';
  RAISE NOTICE '🏆 Total points range: ~45-80 points across 4 weeks';
  RAISE NOTICE '💰 4 completed leagues with winners assigned';
  
END $$;

