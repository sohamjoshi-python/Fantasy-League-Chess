-- Re-enable RLS with permissive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE chess_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_coin_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all operations for all users" ON users;
DROP POLICY IF EXISTS "Enable all operations for all users" ON leagues;
DROP POLICY IF EXISTS "Enable all operations for all users" ON teams;
DROP POLICY IF EXISTS "Enable all operations for all users" ON lineups;
DROP POLICY IF EXISTS "Enable all operations for all users" ON bots;
DROP POLICY IF EXISTS "Enable all operations for all users" ON chess_players;
DROP POLICY IF EXISTS "Enable all operations for all users" ON marketplace_turns;
DROP POLICY IF EXISTS "Enable all operations for all users" ON league_coin_balances;
DROP POLICY IF EXISTS "Enable all operations for all users" ON coin_transactions;

-- Create permissive policies
CREATE POLICY "Enable all operations for all users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON leagues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON lineups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON bots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON chess_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON marketplace_turns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON league_coin_balances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON coin_transactions FOR ALL USING (true) WITH CHECK (true);
