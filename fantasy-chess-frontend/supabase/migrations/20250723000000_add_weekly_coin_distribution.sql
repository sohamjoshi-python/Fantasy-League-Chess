-- Add weekly coin distribution functions
-- This migration adds the necessary functions and tables for automated weekly coin distribution

-- Create table to track weekly coin distributions
CREATE TABLE IF NOT EXISTS weekly_coin_distributions (
    id SERIAL PRIMARY KEY,
    distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    active_leagues_count INTEGER NOT NULL,
    total_coins_distributed INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_weekly_coin_distributions_date ON weekly_coin_distributions(distribution_date);

-- Function to distribute weekly coins to a specific league
CREATE OR REPLACE FUNCTION distribute_weekly_league_coins(league_id UUID)
RETURNS VOID AS $$
DECLARE
    member_record RECORD;
BEGIN
    -- Loop through all members in the league and add 50 coins to each
    FOR member_record IN 
        SELECT user_id FROM league_coin_balances 
        WHERE league_id = distribute_weekly_league_coins.league_id
    LOOP
        -- Add 50 coins to the member's balance
        UPDATE league_coin_balances 
        SET coin_balance = coin_balance + 50
        WHERE league_id = distribute_weekly_league_coins.league_id 
        AND user_id = member_record.user_id;
        
        -- Record the transaction
        INSERT INTO coin_transactions (
            user_id, 
            league_id, 
            transaction_type, 
            amount, 
            description
        ) VALUES (
            member_record.user_id,
            distribute_weekly_league_coins.league_id,
            'weekly_distribution',
            50,
            'Weekly coin distribution for active league'
        );
        
        RAISE NOTICE 'Distributed 50 coins to user % in league %', member_record.user_id, league_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to distribute weekly coins to all active leagues
CREATE OR REPLACE FUNCTION distribute_weekly_coins_to_active_leagues()
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
BEGIN
    -- Loop through all active leagues (leagues that are currently running)
    FOR league_record IN 
        SELECT * FROM leagues 
        WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
    LOOP
        -- Distribute coins to each active league
        PERFORM distribute_weekly_league_coins(league_record.id);
        RAISE NOTICE 'Processed weekly coin distribution for league: % (ID: %)', league_record.name, league_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record distribution details
CREATE OR REPLACE FUNCTION record_weekly_distribution(active_leagues_count INTEGER, total_coins_distributed INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO weekly_coin_distributions (
        distribution_date,
        active_leagues_count,
        total_coins_distributed
    ) VALUES (
        CURRENT_DATE,
        active_leagues_count,
        total_coins_distributed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function that returns JSON result with history tracking
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
        
        -- Update counters
        distribution_count := distribution_count + 1;
        total_coins_distributed := total_coins_distributed + (member_count * 50);
        
        RAISE NOTICE 'Distributed % coins to league: % (ID: %)', (member_count * 50), league_record.name, league_record.id;
    END LOOP;
    
    -- Record the distribution
    PERFORM record_weekly_distribution(distribution_count, total_coins_distributed);
    
    -- Build result JSON
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION distribute_weekly_league_coins(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_weekly_coins_to_active_leagues() TO authenticated;
GRANT EXECUTE ON FUNCTION record_weekly_distribution(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_weekly_coins_to_active_leagues_with_history() TO authenticated;

-- Grant permissions on the weekly_coin_distributions table
GRANT SELECT, INSERT ON weekly_coin_distributions TO authenticated; 