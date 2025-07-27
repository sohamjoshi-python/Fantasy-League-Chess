-- Create lineups table if it doesn't exist

-- Check if lineups table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lineups') THEN
        -- Create lineups table
        CREATE TABLE lineups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id),
            league_id UUID REFERENCES leagues(id),
            week_start_date DATE NOT NULL,
            player_ids TEXT[] DEFAULT '{}',
            total_points DECIMAL(10,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_lineups_user_id ON lineups(user_id);
        CREATE INDEX idx_lineups_league_id ON lineups(league_id);
        CREATE INDEX idx_lineups_week_start_date ON lineups(week_start_date);
        CREATE INDEX idx_lineups_user_league_week ON lineups(user_id, league_id, week_start_date);
        
        -- Enable RLS
        ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
        
        -- Grant permissions
        GRANT ALL ON lineups TO authenticated;
        
        RAISE NOTICE 'Created lineups table';
    ELSE
        RAISE NOTICE 'lineups table already exists';
    END IF;
END $$;

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lineups' 
ORDER BY ordinal_position; 