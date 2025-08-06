-- Check if league_owners column exists in chess_players table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chess_players' 
AND table_schema = 'public'
AND column_name = 'league_owners';

-- If it doesn't exist, we can add it or continue using teams table
-- For now, let's check what columns do exist in chess_players
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'chess_players' 
AND table_schema = 'public'
ORDER BY ordinal_position; 