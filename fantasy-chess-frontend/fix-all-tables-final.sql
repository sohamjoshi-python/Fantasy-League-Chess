-- Final comprehensive fix for all tables causing 406 errors

-- 1. Fix teams table
DROP TABLE IF EXISTS teams CASCADE;

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    league_id UUID,
    player_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_teams_league_id ON teams(league_id);
CREATE INDEX idx_teams_user_league ON teams(user_id, league_id);

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
GRANT ALL ON teams TO authenticated;
GRANT ALL ON teams TO anon;
GRANT ALL ON teams TO service_role;

-- 2. Fix lineups table
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

CREATE INDEX idx_lineups_user_id ON lineups(user_id);
CREATE INDEX idx_lineups_league_id ON lineups(league_id);
CREATE INDEX idx_lineups_week_start_date ON lineups(week_start_date);
CREATE INDEX idx_lineups_user_league_week ON lineups(user_id, league_id, week_start_date);

ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON lineups TO anon;
GRANT ALL ON lineups TO service_role;

-- 3. Fix league_coin_balances table
DROP TABLE IF EXISTS league_coin_balances CASCADE;

CREATE TABLE league_coin_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    league_id UUID,
    coin_balance INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, league_id)
);

CREATE INDEX idx_league_coin_balances_user_id ON league_coin_balances(user_id);
CREATE INDEX idx_league_coin_balances_league_id ON league_coin_balances(league_id);
CREATE INDEX idx_league_coin_balances_user_league ON league_coin_balances(user_id, league_id);

ALTER TABLE league_coin_balances DISABLE ROW LEVEL SECURITY;
GRANT ALL ON league_coin_balances TO authenticated;
GRANT ALL ON league_coin_balances TO anon;
GRANT ALL ON league_coin_balances TO service_role;

-- 4. Insert test data for existing leagues
INSERT INTO teams (user_id, league_id, player_ids)
VALUES 
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID, ARRAY['Hikaru', 'Firouzja2003']),
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'fc9ff414-9b68-42c5-9a68-3fd76040d665'::UUID, ARRAY['Hikaru', 'Firouzja2003'])
ON CONFLICT DO NOTHING;

INSERT INTO league_coin_balances (user_id, league_id, coin_balance)
VALUES 
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID, 50),
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'fc9ff414-9b68-42c5-9a68-3fd76040d665'::UUID, 50)
ON CONFLICT (user_id, league_id) DO UPDATE SET coin_balance = 50;

INSERT INTO lineups (user_id, league_id, week_start_date, player_ids, total_points)
VALUES 
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID, '2025-07-21'::DATE, ARRAY['Hikaru', 'Firouzja2003'], 50.00),
    ('4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID, 'fc9ff414-9b68-42c5-9a68-3fd76040d665'::UUID, '2025-07-21'::DATE, ARRAY['Hikaru', 'Firouzja2003'], 50.00)
ON CONFLICT DO NOTHING;

-- 5. Verify all tables were created and have data
SELECT 
    'teams' as table_name, COUNT(*) as row_count FROM teams
UNION ALL
SELECT 'lineups' as table_name, COUNT(*) as row_count FROM lineups
UNION ALL
SELECT 'league_coin_balances' as table_name, COUNT(*) as row_count FROM league_coin_balances;

-- 6. Test queries for the new league
SELECT 'Testing teams query' as test_name, COUNT(*) as result FROM teams 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID 
  AND league_id = 'fc9ff414-9b68-42c5-9a68-3fd76040d665'::UUID
UNION ALL
SELECT 'Testing lineups query' as test_name, COUNT(*) as result FROM lineups 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID 
  AND league_id = 'fc9ff414-9b68-42c5-9a68-3fd76040d665'::UUID
UNION ALL
SELECT 'Testing coin balances query' as test_name, COUNT(*) as result FROM league_coin_balances 
WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID 
  AND league_id = 'fc9ff414-9b68-42c5-9a68-3fd76040d665'::UUID; 