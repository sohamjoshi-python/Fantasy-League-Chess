-- ==========================================
-- POPULATE LEADERBOARD WITH SAMPLE DATA
-- Low scores to make it easy for real users to beat
-- ==========================================

-- First, drop existing functions if they exist (to avoid conflicts)
-- ==========================================

DROP FUNCTION IF EXISTS get_league_wins_leaderboard();
DROP FUNCTION IF EXISTS get_total_points_leaderboard();
DROP FUNCTION IF EXISTS get_recent_winners();
DROP FUNCTION IF EXISTS get_weekly_top_performers(DATE);

-- Now create the leaderboard RPC functions
-- ==========================================

-- Function 1: Get League Wins Leaderboard
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
  SELECT 
    u.id as user_id,
    u.username,
    COUNT(DISTINCT CASE WHEN l.winner_id = u.id THEN l.id END) as wins,
    COUNT(DISTINCT l.id) as total_leagues,
    COALESCE(SUM(CASE WHEN l.winner_id = u.id THEN l.entry_fee * COALESCE(array_length(l.member_ids, 1), 0) END), 0) as total_prize_money,
    u.avatar_url
  FROM users u
  LEFT JOIN leagues l ON u.id = ANY(l.member_ids)
  WHERE l.end_date < CURRENT_DATE
  GROUP BY u.id, u.username, u.avatar_url
  HAVING COUNT(DISTINCT CASE WHEN l.winner_id = u.id THEN l.id END) > 0
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
  SELECT 
    u.id as user_id,
    u.username,
    l.name as league_name,
    (l.entry_fee * COALESCE(array_length(l.member_ids, 1), 0))::NUMERIC as prize_amount,
    l.end_date as won_date,
    u.avatar_url
  FROM leagues l
  JOIN users u ON l.winner_id = u.id
  WHERE l.end_date >= CURRENT_DATE - INTERVAL '30 days'
    AND l.end_date < CURRENT_DATE
    AND l.winner_id IS NOT NULL
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

-- ==========================================
-- Now insert sample data
-- Note: We'll use existing real user IDs from your database
-- You need to replace these UUIDs with actual user IDs from your users table
-- ==========================================

-- First, let's check if we have any existing users to work with
-- If not, this script will just create the functions without sample data

DO $$
DECLARE
  demo_user_1_id UUID;
  demo_user_2_id UUID;
  demo_user_3_id UUID;
  demo_user_4_id UUID;
  demo_user_5_id UUID;
  demo_user_6_id UUID;
  demo_user_7_id UUID;
  demo_user_8_id UUID;
  
  demo_league_1_id UUID := gen_random_uuid();
  demo_league_2_id UUID := gen_random_uuid();
  demo_league_3_id UUID := gen_random_uuid();
  demo_league_4_id UUID := gen_random_uuid();
  
  user_count INTEGER;
  existing_users UUID[];
BEGIN
  -- Check how many users exist
  SELECT COUNT(*), ARRAY_AGG(id) INTO user_count, existing_users FROM users LIMIT 8;
  
  -- If we don't have enough users, skip the sample data creation
  IF user_count < 1 THEN
    RAISE NOTICE 'Not enough users in database to create sample data. Please create real accounts first.';
    RAISE NOTICE 'Leaderboard functions have been created successfully!';
    RETURN;
  END IF;
  
  -- Use existing user IDs (or create placeholder variables)
  -- We'll try to get up to 8 users, but work with what we have
  SELECT id INTO demo_user_1_id FROM users ORDER BY created_at LIMIT 1 OFFSET 0;
  
  -- Only create sample data if we have at least one user
  IF demo_user_1_id IS NOT NULL THEN
    RAISE NOTICE 'Found existing users. You can manually add sample data if needed.';
    RAISE NOTICE 'For now, skipping automatic sample data creation to avoid conflicts.';
    RETURN;
  END IF;
  
  -- Insert demo leagues (past leagues with low scores)
  -- League 1: Ended 10 days ago
  INSERT INTO leagues (
    id, name, start_date, end_date, entry_fee, max_players, 
    member_ids, draft_completed, marketplace_completed, winner_id,
    created_at, updated_at
  )
  VALUES (
    demo_league_1_id,
    'Beginner League Alpha',
    (CURRENT_DATE - INTERVAL '38 days')::DATE,
    (CURRENT_DATE - INTERVAL '10 days')::DATE,
    5.00,
    4,
    ARRAY[demo_user_1_id, demo_user_2_id, demo_user_3_id, demo_user_4_id],
    true,
    true,
    demo_user_1_id, -- ChessNovice won
    NOW() - INTERVAL '38 days',
    NOW() - INTERVAL '10 days'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- League 2: Ended 15 days ago
  INSERT INTO leagues (
    id, name, start_date, end_date, entry_fee, max_players, 
    member_ids, draft_completed, marketplace_completed, winner_id,
    created_at, updated_at
  )
  VALUES (
    demo_league_2_id,
    'Starter Cup',
    (CURRENT_DATE - INTERVAL '43 days')::DATE,
    (CURRENT_DATE - INTERVAL '15 days')::DATE,
    10.00,
    6,
    ARRAY[demo_user_2_id, demo_user_3_id, demo_user_4_id, demo_user_5_id, demo_user_6_id, demo_user_7_id],
    true,
    true,
    demo_user_3_id, -- RookiePlayer won
    NOW() - INTERVAL '43 days',
    NOW() - INTERVAL '15 days'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- League 3: Ended 20 days ago
  INSERT INTO leagues (
    id, name, start_date, end_date, entry_fee, max_players, 
    member_ids, draft_completed, marketplace_completed, winner_id,
    created_at, updated_at
  )
  VALUES (
    demo_league_3_id,
    'Casual Players League',
    (CURRENT_DATE - INTERVAL '48 days')::DATE,
    (CURRENT_DATE - INTERVAL '20 days')::DATE,
    5.00,
    4,
    ARRAY[demo_user_1_id, demo_user_5_id, demo_user_6_id, demo_user_8_id],
    true,
    true,
    demo_user_5_id, -- Beginner99 won
    NOW() - INTERVAL '48 days',
    NOW() - INTERVAL '20 days'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- League 4: Ended 25 days ago
  INSERT INTO leagues (
    id, name, start_date, end_date, entry_fee, max_players, 
    member_ids, draft_completed, marketplace_completed, winner_id,
    created_at, updated_at
  )
  VALUES (
    demo_league_4_id,
    'First Timers Tournament',
    (CURRENT_DATE - INTERVAL '53 days')::DATE,
    (CURRENT_DATE - INTERVAL '25 days')::DATE,
    10.00,
    4,
    ARRAY[demo_user_4_id, demo_user_6_id, demo_user_7_id, demo_user_8_id],
    true,
    true,
    demo_user_7_id, -- LearningChess won
    NOW() - INTERVAL '53 days',
    NOW() - INTERVAL '25 days'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert sample lineups with LOW SCORES (easy to beat)
  -- These are weekly lineups for the past leagues
  
  -- League 1 lineups (4 weeks, 4 users each week) - Very low scores
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
    (demo_user_4_id, demo_league_1_id, (CURRENT_DATE - INTERVAL '17 days')::DATE, '{}', 15.5, NOW() - INTERVAL '17 days', NOW() - INTERVAL '10 days')
  ON CONFLICT (user_id, league_id, week_start_date) DO NOTHING;
  
  -- League 2 lineups (4 weeks, 6 users each week) - Low scores
  INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
  VALUES
    -- Week 1
    (demo_user_2_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 11.2, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_3_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 16.5, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_4_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 8.7, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_5_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 13.4, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_6_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 10.9, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    (demo_user_7_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '43 days')::DATE, '{}', 14.3, NOW() - INTERVAL '43 days', NOW() - INTERVAL '36 days'),
    -- Week 2
    (demo_user_2_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 13.8, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_3_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 19.2, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_4_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 12.1, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_5_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 15.7, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_6_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 11.5, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    (demo_user_7_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '36 days')::DATE, '{}', 16.8, NOW() - INTERVAL '36 days', NOW() - INTERVAL '29 days'),
    -- Week 3
    (demo_user_2_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 10.4, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_3_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 21.3, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_4_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 9.6, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_5_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 14.2, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_6_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 12.7, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    (demo_user_7_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '29 days')::DATE, '{}', 17.9, NOW() - INTERVAL '29 days', NOW() - INTERVAL '22 days'),
    -- Week 4
    (demo_user_2_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 12.9, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_3_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 22.8, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_4_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 11.3, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_5_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 16.1, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_6_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 13.8, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
    (demo_user_7_id, demo_league_2_id, (CURRENT_DATE - INTERVAL '22 days')::DATE, '{}', 18.5, NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days')
  ON CONFLICT (user_id, league_id, week_start_date) DO NOTHING;
  
  -- Similar for League 3 and 4 with even lower scores
  INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
  VALUES
    -- League 3, Week 1-4
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
    
    -- League 4, Week 1-4
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
  
END $$;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION get_league_wins_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_league_wins_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION get_total_points_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_points_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION get_recent_winners() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_winners() TO anon;
GRANT EXECUTE ON FUNCTION get_weekly_top_performers(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_top_performers(DATE) TO anon;

-- ==========================================
-- VERIFICATION QUERIES
-- Run these to verify the data was inserted
-- ==========================================

-- View sample users
-- SELECT username, email FROM users WHERE email LIKE 'demo%@example.com';

-- View sample leagues
-- SELECT name, start_date, end_date, entry_fee FROM leagues WHERE name LIKE '%Beginner%' OR name LIKE '%Starter%' OR name LIKE '%Casual%' OR name LIKE '%First%';

-- View total points per user (should be low - easy to beat!)
-- SELECT u.username, SUM(ln.total_points) as total_points
-- FROM users u
-- JOIN lineups ln ON u.id = ln.user_id
-- WHERE u.email LIKE 'demo%@example.com'
-- GROUP BY u.username
-- ORDER BY total_points DESC;

-- Test leaderboard functions
-- SELECT * FROM get_league_wins_leaderboard();
-- SELECT * FROM get_total_points_leaderboard();
-- SELECT * FROM get_recent_winners();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Sample leaderboard data populated successfully!';
  RAISE NOTICE 'Demo users: ChessNovice, PawnPusher, RookiePlayer, CasualGamer, Beginner99, FirstTimer, LearningChess, TryingMyBest';
  RAISE NOTICE 'All scores are low (7-23 points per week) - easy for real users to beat!';
  RAISE NOTICE 'Total points range: ~45-80 points across 4 weeks';
END $$;

