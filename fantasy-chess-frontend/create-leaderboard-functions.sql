-- Create leaderboard functions for Fantasy Chess
-- Run this in your Supabase SQL editor

-- Function to get league wins leaderboard (users who have won the most leagues)
CREATE OR REPLACE FUNCTION get_league_wins_leaderboard()
RETURNS TABLE (
    user_id uuid,
    username text,
    wins integer,
    total_leagues integer,
    total_prize_money numeric,
    avatar_url text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.username,
        COUNT(p.id) as wins,
        COUNT(DISTINCT l.id) as total_leagues,
        COALESCE(SUM(p.amount), 0) as total_prize_money,
        u.selected_avatar_url as avatar_url
    FROM users u
    LEFT JOIN payouts p ON u.id = p.user_id
    LEFT JOIN leagues l ON p.league_id = l.id
    WHERE u.username IS NOT NULL
    GROUP BY u.id, u.username, u.selected_avatar_url
    HAVING COUNT(p.id) > 0
    ORDER BY wins DESC, total_prize_money DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total points leaderboard (users with highest total points across all leagues)
CREATE OR REPLACE FUNCTION get_total_points_leaderboard()
RETURNS TABLE (
    user_id uuid,
    username text,
    total_points numeric,
    leagues_played integer,
    average_points_per_league numeric,
    avatar_url text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.username,
        COALESCE(SUM(l.total_points), 0) as total_points,
        COUNT(DISTINCT l.league_id) as leagues_played,
        CASE 
            WHEN COUNT(DISTINCT l.league_id) > 0 
            THEN COALESCE(SUM(l.total_points), 0) / COUNT(DISTINCT l.league_id)
            ELSE 0 
        END as average_points_per_league,
        u.selected_avatar_url as avatar_url
    FROM users u
    LEFT JOIN lineups l ON u.id = l.user_id
    WHERE u.username IS NOT NULL
    GROUP BY u.id, u.username, u.selected_avatar_url
    HAVING COALESCE(SUM(l.total_points), 0) > 0
    ORDER BY total_points DESC, average_points_per_league DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent winners (users who won leagues in the last 30 days)
CREATE OR REPLACE FUNCTION get_recent_winners()
RETURNS TABLE (
    user_id uuid,
    username text,
    league_name text,
    prize_amount numeric,
    won_date timestamp,
    avatar_url text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.username,
        l.name as league_name,
        p.amount as prize_amount,
        p.processed_at as won_date,
        u.selected_avatar_url as avatar_url
    FROM users u
    JOIN payouts p ON u.id = p.user_id
    JOIN leagues l ON p.league_id = l.id
    WHERE u.username IS NOT NULL
      AND p.processed_at >= NOW() - INTERVAL '30 days'
    ORDER BY p.processed_at DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top performers by week (users with highest points in a specific week)
CREATE OR REPLACE FUNCTION get_weekly_top_performers(week_date date)
RETURNS TABLE (
    user_id uuid,
    username text,
    league_name text,
    week_points numeric,
    avatar_url text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.username,
        l.name as league_name,
        ln.total_points as week_points,
        u.selected_avatar_url as avatar_url
    FROM users u
    JOIN lineups ln ON u.id = ln.user_id
    JOIN leagues l ON ln.league_id = l.id
    WHERE u.username IS NOT NULL
      AND ln.week_start_date = week_date
      AND ln.total_points > 0
    ORDER BY ln.total_points DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_league_wins_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_points_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_winners() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_top_performers(date) TO authenticated; 