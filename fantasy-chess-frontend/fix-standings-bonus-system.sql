-- Fix Standings Bonus System
-- Recreate the missing table and functions that were dropped during cleanup

-- Create table to track standings bonus distributions
CREATE TABLE IF NOT EXISTS standings_bonus_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_bonus_points_awarded INTEGER NOT NULL,
    participants_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_standings_bonus_distributions_date ON standings_bonus_distributions(distribution_date);
CREATE INDEX IF NOT EXISTS idx_standings_bonus_distributions_league ON standings_bonus_distributions(league_id);

-- Function to calculate bonus points based on rank
CREATE OR REPLACE FUNCTION calculate_standings_bonus(rank_position INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE 
        WHEN rank_position = 1 THEN 50  -- 1st place: 50 bonus points
        WHEN rank_position = 2 THEN 40  -- 2nd place: 40 bonus points
        WHEN rank_position = 3 THEN 30  -- 3rd place: 30 bonus points
        WHEN rank_position = 4 THEN 20  -- 4th place: 20 bonus points
        WHEN rank_position >= 5 THEN 10 -- 5th place and below: 10 bonus points
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to award standings bonus points to a specific league
CREATE OR REPLACE FUNCTION award_standings_bonus_for_league(p_league_id UUID)
RETURNS JSON AS $$
DECLARE
    league_record RECORD;
    standings_record RECORD;
    bonus_points INTEGER;
    total_bonus_awarded INTEGER := 0;
    participants_count INTEGER := 0;
    result JSON;
BEGIN
    -- Get league information
    SELECT * INTO league_record FROM leagues WHERE id = p_league_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'League not found',
            'league_id', p_league_id
        );
    END IF;

    -- Check if league has ended
    IF league_record.end_date > CURRENT_DATE THEN
        RETURN json_build_object(
            'success', false,
            'error', 'League has not ended yet',
            'league_id', p_league_id,
            'end_date', league_record.end_date
        );
    END IF;

    -- Check if bonus has already been awarded
    IF EXISTS (
        SELECT 1 FROM standings_bonus_distributions 
        WHERE league_id = p_league_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Standings bonus already awarded for this league',
            'league_id', p_league_id
        );
    END IF;

    -- Get standings for the league
    FOR standings_record IN 
        WITH user_points AS (
            SELECT 
                l.user_id,
                u.email as user_email,
                COALESCE(SUM(l.total_points), 0) as total_points
            FROM lineups l
            JOIN users u ON l.user_id = u.id
            WHERE l.league_id = p_league_id
            GROUP BY l.user_id, u.email
        ),
        ranked_standings AS (
            SELECT 
                user_id,
                user_email,
                total_points,
                ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
            FROM user_points
        )
        SELECT * FROM ranked_standings
    LOOP
        -- Calculate bonus points for this rank
        bonus_points := calculate_standings_bonus(standings_record.rank);
        
        -- Award bonus points to user's coin balance
        INSERT INTO coin_balances (user_id, balance, updated_at)
        VALUES (standings_record.user_id, bonus_points, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            balance = coin_balances.balance + bonus_points,
            updated_at = NOW();
        
        -- Record the transaction
        INSERT INTO coin_transactions (
            user_id,
            transaction_type,
            amount,
            description,
            created_at
        ) VALUES (
            standings_record.user_id,
            'standings_bonus',
            bonus_points,
            format('Standings bonus for %s place in league %s', 
                   standings_record.rank, 
                   league_record.name),
            NOW()
        );
        
        -- Update counters
        total_bonus_awarded := total_bonus_awarded + bonus_points;
        participants_count := participants_count + 1;
    END LOOP;

    -- Record the distribution
    INSERT INTO standings_bonus_distributions (
        league_id,
        distribution_date,
        total_bonus_points_awarded,
        participants_count
    ) VALUES (
        p_league_id,
        CURRENT_DATE,
        total_bonus_awarded,
        participants_count
    );

    -- Build result
    result := json_build_object(
        'success', true,
        'message', 'Standings bonus awarded successfully',
        'league_id', p_league_id,
        'league_name', league_record.name,
        'participants_count', participants_count,
        'total_bonus_awarded', total_bonus_awarded,
        'timestamp', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award standings bonus points to all completed leagues
CREATE OR REPLACE FUNCTION award_standings_bonus_points()
RETURNS JSON AS $$
DECLARE
    league_record RECORD;
    total_leagues_processed INTEGER := 0;
    total_bonus_awarded INTEGER := 0;
    total_participants INTEGER := 0;
    league_results JSON[] := '{}';
    result JSON;
BEGIN
    -- Loop through all completed leagues that haven't received bonus yet
    FOR league_record IN 
        SELECT l.* FROM leagues l
        WHERE l.end_date <= CURRENT_DATE
        AND l.payout_processed = true  -- Only process leagues that have had payouts processed
        AND NOT EXISTS (
            SELECT 1 FROM standings_bonus_distributions sbd 
            WHERE sbd.league_id = l.id
        )
        ORDER BY l.end_date DESC
    LOOP
        -- Award bonus for this league
        SELECT award_standings_bonus_for_league(league_record.id) INTO result;
        
        -- Add to results array
        league_results := league_results || result;
        
        -- Update counters
        total_leagues_processed := total_leagues_processed + 1;
        
        IF (result->>'success')::boolean THEN
            total_bonus_awarded := total_bonus_awarded + (result->>'total_bonus_awarded')::integer;
            total_participants := total_participants + (result->>'participants_count')::integer;
        END IF;
    END LOOP;

    -- Build final result
    result := json_build_object(
        'success', true,
        'message', 'Standings bonus distribution completed',
        'leagues_processed', total_leagues_processed,
        'total_bonus_awarded', total_bonus_awarded,
        'total_participants', total_participants,
        'league_results', league_results,
        'timestamp', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_standings_bonus(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION award_standings_bonus_for_league(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION award_standings_bonus_points() TO authenticated;

-- Grant permissions on the standings_bonus_distributions table
GRANT SELECT, INSERT ON standings_bonus_distributions TO authenticated;

-- Set up RLS policies for standings_bonus_distributions
ALTER TABLE standings_bonus_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view standings bonus distributions" ON standings_bonus_distributions
    FOR SELECT USING (true);

-- Add standings_bonus transaction type to coin_transactions check constraint if it doesn't exist
DO $$
BEGIN
    -- Check if the constraint exists and if it includes 'standings_bonus'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'coin_transactions_transaction_type_check'
    ) THEN
        -- Create the constraint if it doesn't exist
        ALTER TABLE coin_transactions ADD CONSTRAINT coin_transactions_transaction_type_check 
        CHECK (transaction_type IN ('join_bonus', 'weekly_award', 'player_purchase', 'player_sale', 'trade', 'refund', 'standings_bonus'));
    ELSE
        -- Check if standings_bonus is already in the constraint
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'coin_transactions_transaction_type_check' 
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%standings_bonus%'
        ) THEN
            -- Drop and recreate the constraint to add standings_bonus
            ALTER TABLE coin_transactions DROP CONSTRAINT coin_transactions_transaction_type_check;
            ALTER TABLE coin_transactions ADD CONSTRAINT coin_transactions_transaction_type_check 
            CHECK (transaction_type IN ('join_bonus', 'weekly_award', 'player_purchase', 'player_sale', 'trade', 'refund', 'standings_bonus'));
        END IF;
    END IF;
END $$;

-- Verify the functions were created
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname IN ('award_standings_bonus_points', 'award_standings_bonus_for_league', 'calculate_standings_bonus')
ORDER BY proname;
