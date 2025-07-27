-- Check if lineups table exists and its structure

-- 1. Check if lineups table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'lineups'
) as lineups_table_exists;

-- 2. If it exists, show its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'lineups' 
ORDER BY ordinal_position;

-- 3. Check if teams table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'teams'
) as teams_table_exists;

-- 4. Check if league_coin_balances table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'league_coin_balances'
) as league_coin_balances_table_exists;

-- 5. List all tables in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name; 