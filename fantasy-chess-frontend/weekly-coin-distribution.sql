-- Weekly Coin Distribution for Active Leagues
-- This function automatically distributes 50 coins to all players in active leagues

-- Function to distribute weekly coins to all active leagues
CREATE OR REPLACE FUNCTION distribute_weekly_coins_to_active_leagues()
RETURNS void AS $$
DECLARE
    league_record RECORD;
    distribution_count INTEGER := 0;
BEGIN
    -- Loop through all active leagues (leagues that are currently running)
    FOR league_record IN 
        SELECT * FROM leagues 
        WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
    LOOP
        -- Distribute coins to this league
        PERFORM distribute_weekly_league_coins(league_record.id);
        distribution_count := distribution_count + 1;
        
        -- Log the distribution
        RAISE NOTICE 'Distributed weekly coins to league: % (ID: %)', league_record.name, league_record.id;
    END LOOP;
    
    -- Log summary
    RAISE NOTICE 'Weekly coin distribution completed. Processed % active leagues.', distribution_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION distribute_weekly_coins_to_active_leagues() TO authenticated;

-- Function to manually trigger weekly distribution (for testing)
CREATE OR REPLACE FUNCTION trigger_weekly_coin_distribution()
RETURNS JSON AS $$
DECLARE
    result JSON;
    league_count INTEGER;
BEGIN
    -- Count active leagues
    SELECT COUNT(*) INTO league_count
    FROM leagues 
    WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE;
    
    -- Execute the distribution
    PERFORM distribute_weekly_coins_to_active_leagues();
    
    -- Return result
    result := json_build_object(
        'success', true,
        'message', 'Weekly coin distribution completed',
        'active_leagues_processed', league_count,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_weekly_coin_distribution() TO authenticated;

-- Create a table to track weekly distributions
CREATE TABLE IF NOT EXISTS weekly_coin_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    active_leagues_count INTEGER NOT NULL,
    total_coins_distributed INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to record distribution history
CREATE OR REPLACE FUNCTION record_weekly_distribution(p_active_leagues_count INTEGER, p_total_coins INTEGER)
RETURNS void AS $$
BEGIN
    INSERT INTO weekly_coin_distributions (
        distribution_date,
        active_leagues_count,
        total_coins_distributed
    ) VALUES (
        CURRENT_DATE,
        p_active_leagues_count,
        p_total_coins
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function with history tracking
CREATE OR REPLACE FUNCTION distribute_weekly_coins_to_active_leagues_with_history()
RETURNS JSON AS $$
DECLARE
    league_record RECORD;
    distribution_count INTEGER := 0;
    total_coins_distributed INTEGER := 0;
    member_count INTEGER;
    result JSON;
BEGIN
    -- Loop through all active leagues
    FOR league_record IN 
        SELECT * FROM leagues 
        WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
    LOOP
        -- Count members in this league
        SELECT COUNT(*) INTO member_count
        FROM league_coin_balances 
        WHERE league_id = league_record.id;
        
        -- Distribute coins to this league
        PERFORM distribute_weekly_league_coins(league_record.id);
        
        distribution_count := distribution_count + 1;
        total_coins_distributed := total_coins_distributed + (member_count * 50);
        
        RAISE NOTICE 'Distributed % coins to league: % (ID: %)', (member_count * 50), league_record.name, league_record.id;
    END LOOP;
    
    -- Record the distribution
    PERFORM record_weekly_distribution(distribution_count, total_coins_distributed);
    
    -- Return result
    result := json_build_object(
        'success', true,
        'message', 'Weekly coin distribution completed',
        'active_leagues_processed', distribution_count,
        'total_coins_distributed', total_coins_distributed,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION distribute_weekly_coins_to_active_leagues_with_history() TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leagues_active_date_range ON leagues(start_date, end_date);

-- Add RLS policy for weekly_coin_distributions table
ALTER TABLE weekly_coin_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weekly distribution history" ON weekly_coin_distributions
    FOR SELECT USING (true);

-- Test query to see active leagues
-- SELECT id, name, start_date, end_date FROM leagues WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE; 