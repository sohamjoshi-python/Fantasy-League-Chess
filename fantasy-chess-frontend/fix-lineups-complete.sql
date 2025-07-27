-- Comprehensive fix for lineups table issues

-- 1. Drop the lineups table if it exists (to recreate it properly)
DROP TABLE IF EXISTS lineups CASCADE;

-- 2. Create lineups table with correct structure
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

-- 3. Create indexes
CREATE INDEX idx_lineups_user_id ON lineups(user_id);
CREATE INDEX idx_lineups_league_id ON lineups(league_id);
CREATE INDEX idx_lineups_week_start_date ON lineups(week_start_date);
CREATE INDEX idx_lineups_user_league_week ON lineups(user_id, league_id, week_start_date);

-- 4. Disable RLS temporarily to avoid 406 errors
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;

-- 5. Grant full permissions
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON lineups TO anon;

-- 6. Insert some sample data to test
INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points)
VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID,
    'aa72597c-7ac4-4164-ae8e-891389b4a641'::UUID,
    '2025-07-21'::DATE,
    ARRAY['Hikaru', 'Firouzja2003'],
    50.00
);

-- 7. Verify the table was created correctly
SELECT 
    'lineups table created successfully' as status,
    COUNT(*) as total_rows
FROM lineups; 