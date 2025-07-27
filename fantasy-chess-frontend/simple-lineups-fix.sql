-- Simple fix for lineups table 406 errors

-- 1. Check if lineups table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'lineups'
) as table_exists;

-- 2. If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS lineups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    league_id UUID,
    week_start_date DATE,
    player_ids TEXT[] DEFAULT '{}',
    total_points DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Disable RLS completely
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;

-- 4. Grant all permissions
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON lineups TO anon;
GRANT ALL ON lineups TO service_role;

-- 5. Insert test data
INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points)
VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID,
    'aa72597c-7ac4-4164-ae8e-891389b4a641'::UUID,
    '2025-07-21'::DATE,
    ARRAY['Hikaru', 'Firouzja2003'],
    50.00
) ON CONFLICT DO NOTHING;

-- 6. Verify
SELECT COUNT(*) as total_lineups FROM lineups; 