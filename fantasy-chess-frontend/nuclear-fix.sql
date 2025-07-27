-- Nuclear fix: Completely remove and recreate all tables with NO RLS

-- 1. Drop all problematic tables
DROP TABLE IF EXISTS lineups CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS league_coin_balances CASCADE;

-- 2. Create teams table with NO RLS
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    league_id UUID,
    player_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create lineups table with NO RLS
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

-- 4. Create league_coin_balances table with NO RLS
CREATE TABLE league_coin_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    league_id UUID,
    coin_balance INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, league_id)
);

-- 5. Create indexes
CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_teams_league_id ON teams(league_id);
CREATE INDEX idx_teams_user_league ON teams(user_id, league_id);

CREATE INDEX idx_lineups_user_id ON lineups(user_id);
CREATE INDEX idx_lineups_league_id ON lineups(league_id);
CREATE INDEX idx_lineups_week_start_date ON lineups(week_start_date);
CREATE INDEX idx_lineups_user_league_week ON lineups(user_id, league_id, week_start_date);

CREATE INDEX idx_league_coin_balances_user_id ON league_coin_balances(user_id);
CREATE INDEX idx_league_coin_balances_league_id ON league_coin_balances(league_id);
CREATE INDEX idx_league_coin_balances_user_league ON league_coin_balances(user_id, league_id);

-- 6. EXPLICITLY disable RLS on all tables
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_coin_balances DISABLE ROW LEVEL SECURITY;

-- 7. Grant ALL permissions to ALL roles
GRANT ALL ON teams TO authenticated;
GRANT ALL ON teams TO anon;
GRANT ALL ON teams TO service_role;
GRANT ALL ON teams TO postgres;

GRANT ALL ON lineups TO authenticated;
GRANT ALL ON lineups TO anon;
GRANT ALL ON lineups TO service_role;
GRANT ALL ON lineups TO postgres;

GRANT ALL ON league_coin_balances TO authenticated;
GRANT ALL ON league_coin_balances TO anon;
GRANT ALL ON league_coin_balances TO service_role;
GRANT ALL ON league_coin_balances TO postgres;

-- 8. Grant USAGE on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 9. Insert test data for all known leagues
INSERT INTO teams (user_id, league_id, player_ids)
VALUES 
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID, ARRAY['Hikaru', 'Firouzja2003']),
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'fc9ff414-9b68-42c5-9a68-3fd76040d665'::UUID, ARRAY['Hikaru', 'Firouzja2003']),
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'd601a74a-7ab8-4c8a-a13b-0da3adf2add0'::UUID, ARRAY['Hikaru', 'Firouzja2003'])
ON CONFLICT DO NOTHING;

INSERT INTO league_coin_balances (user_id, league_id, coin_balance)
VALUES 
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID, 50),
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'fc9ff414-9b68-42c5-9a68-3fd76040d665'::UUID, 50),
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'd601a74a-7ab8-4c8a-a13b-0da3adf2add0'::UUID, 50)
ON CONFLICT (user_id, league_id) DO UPDATE SET coin_balance = 50;

INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points)
VALUES 
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID, '2025-07-21'::DATE, ARRAY['Hikaru', 'Firouzja2003'], 50.00),
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'fc9ff414-9b68-42c5-9a68-3fd76040d665'::UUID, '2025-07-21'::DATE, ARRAY['Hikaru', 'Firouzja2003'], 50.00),
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'd601a74a-7ab8-4c8a-a13b-0da3adf2add0'::UUID, '2025-07-21'::DATE, ARRAY['Hikaru', 'Firouzja2003'], 50.00)
ON CONFLICT DO NOTHING;

-- 10. Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('lineups', 'teams', 'league_coin_balances')
ORDER BY tablename;

-- 11. Test queries
SELECT 'Testing teams query' as test_name, COUNT(*) as result FROM teams 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID 
  AND league_id = 'd601a74a-7ab8-4c8a-a13b-0da3adf2add0'::UUID
UNION ALL
SELECT 'Testing lineups query' as test_name, COUNT(*) as result FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID 
  AND league_id = 'd601a74a-7ab8-4c8a-a13b-0da3adf2add0'::UUID
UNION ALL
SELECT 'Testing coin balances query' as test_name, COUNT(*) as result FROM league_coin_balances 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID 
  AND league_id = 'd601a74a-7ab8-4c8a-a13b-0da3adf2add0'::UUID; 