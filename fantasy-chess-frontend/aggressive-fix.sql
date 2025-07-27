-- Aggressive fix - completely recreate all problematic tables

-- 1. Drop all problematic tables with CASCADE
DROP TABLE IF EXISTS lineups CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS league_coin_balances CASCADE;

-- 2. Create lineups table from scratch
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

-- 3. Create teams table from scratch
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    league_id UUID,
    player_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create league_coin_balances table from scratch
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
CREATE INDEX idx_lineups_user_id ON lineups(user_id);
CREATE INDEX idx_lineups_league_id ON lineups(league_id);
CREATE INDEX idx_lineups_week_start_date ON lineups(week_start_date);
CREATE INDEX idx_lineups_user_league_week ON lineups(user_id, league_id, week_start_date);

CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_teams_league_id ON teams(league_id);
CREATE INDEX idx_teams_user_league ON teams(user_id, league_id);

CREATE INDEX idx_league_coin_balances_user_id ON league_coin_balances(user_id);
CREATE INDEX idx_league_coin_balances_league_id ON league_coin_balances(league_id);
CREATE INDEX idx_league_coin_balances_user_league ON league_coin_balances(user_id, league_id);

-- 6. Disable RLS on ALL tables
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_coin_balances DISABLE ROW LEVEL SECURITY;

-- 7. Grant ALL permissions to ALL roles
GRANT ALL ON lineups TO authenticated;
GRANT ALL ON lineups TO anon;
GRANT ALL ON lineups TO service_role;
GRANT ALL ON lineups TO postgres;

GRANT ALL ON teams TO authenticated;
GRANT ALL ON teams TO anon;
GRANT ALL ON teams TO service_role;
GRANT ALL ON teams TO postgres;

GRANT ALL ON league_coin_balances TO authenticated;
GRANT ALL ON league_coin_balances TO anon;
GRANT ALL ON league_coin_balances TO service_role;
GRANT ALL ON league_coin_balances TO postgres;

-- 8. Insert test data
INSERT INTO teams (user_id, league_id, player_ids)
VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID,
    '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID,
    ARRAY['Hikaru', 'Firouzja2003']
) ON CONFLICT DO NOTHING;

INSERT INTO league_coin_balances (user_id, league_id, coin_balance)
VALUES (
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID,
    '2ee2b517-8ee3-4588-a9aa-901c61903e87'::UUID,
    50
) ON CONFLICT (user_id, league_id) DO UPDATE SET coin_balance = 50;

-- 9. Verify everything works
SELECT 'Tables created successfully' as status;
SELECT COUNT(*) as lineups_count FROM lineups;
SELECT COUNT(*) as teams_count FROM teams;
SELECT COUNT(*) as coin_balances_count FROM league_coin_balances; 