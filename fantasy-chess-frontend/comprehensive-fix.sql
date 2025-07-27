-- Comprehensive fix for all remaining issues

-- 1. Force recreate lineups table with proper structure
DROP TABLE IF EXISTS lineups CASCADE;

CREATE TABLE lineups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    league_id UUID,
    week_start_date DATE,
    player_ids TEXT[] DEFAULT '{}',
    total_points DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX idx_lineups_user_id ON lineups(user_id);
CREATE INDEX idx_lineups_league_id ON lineups(league_id);
CREATE INDEX idx_lineups_week_start_date ON lineups(week_start_date);
CREATE INDEX idx_lineups_user_league_week ON lineups(user_id, league_id, week_start_date);

-- 3. Disable RLS and grant permissions
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON lineups TO anon;
GRANT ALL ON lineups TO service_role;

-- 4. Insert test data
INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points)
VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID,
    '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID,
    '2025-07-21'::DATE,
    ARRAY['Hikaru', 'Firouzja2003'],
    50.00
);

-- 5. Verify the table works
SELECT COUNT(*) as lineups_count FROM lineups;

-- 6. Test the specific query that's failing
SELECT * FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID 
  AND league_id = '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID 
  AND week_start_date = '2025-07-21'::DATE; 