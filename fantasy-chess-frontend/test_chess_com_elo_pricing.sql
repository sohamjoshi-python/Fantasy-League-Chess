-- Test query to see actual chess.com ELO values and adjust pricing
-- Chess.com ELO ratings are typically much lower than FIDE ratings

-- First, let's see what ELO values we actually have
SELECT 
    cp.name,
    cp.elo as chess_com_elo,
    cp.country,
    -- Current formula (designed for FIDE ratings)
    GREATEST(1, 10 + (cp.elo - 2700) / 10) as current_price,
    -- Adjusted formula for chess.com ELO (assuming typical range 2000-3000)
    GREATEST(1, 10 + (cp.elo - 2500) / 50) as adjusted_price_1,
    -- Alternative formula for chess.com ELO (more granular)
    GREATEST(1, 5 + (cp.elo - 2000) / 100) as adjusted_price_2,
    -- Strategic tier-based pricing for chess.com (50⭐ per week budget)
    CASE 
        WHEN cp.elo >= 3000 THEN 50
        WHEN cp.elo >= 2800 THEN 40
        WHEN cp.elo >= 2600 THEN 30
        WHEN cp.elo >= 2400 THEN 20
        WHEN cp.elo >= 2200 THEN 12
        WHEN cp.elo >= 2000 THEN 8
        ELSE 3
    END as tier_based_price
FROM public.chess_players cp
ORDER BY cp.elo DESC;

-- Show ELO distribution with strategic pricing
SELECT 
    'ELO Range' as range,
    'Count' as player_count,
    'Price' as price_info,
    'Budget %' as budget_percentage
UNION ALL
SELECT 
    '3000+' as range,
    COUNT(*)::text as player_count,
    '50 ⭐' as price_info,
    '100%' as budget_percentage
FROM public.chess_players WHERE elo >= 3000
UNION ALL
SELECT 
    '2800-2999' as range,
    COUNT(*)::text as player_count,
    '40 ⭐' as price_info,
    '80%' as budget_percentage
FROM public.chess_players WHERE elo >= 2800 AND elo < 3000
UNION ALL
SELECT 
    '2600-2799' as range,
    COUNT(*)::text as player_count,
    '30 ⭐' as price_info,
    '60%' as budget_percentage
FROM public.chess_players WHERE elo >= 2600 AND elo < 2800
UNION ALL
SELECT 
    '2400-2599' as range,
    COUNT(*)::text as player_count,
    '20 ⭐' as price_info,
    '40%' as budget_percentage
FROM public.chess_players WHERE elo >= 2400 AND elo < 2600
UNION ALL
SELECT 
    '2200-2399' as range,
    COUNT(*)::text as player_count,
    '12 ⭐' as price_info,
    '24%' as budget_percentage
FROM public.chess_players WHERE elo >= 2200 AND elo < 2400
UNION ALL
SELECT 
    '2000-2199' as range,
    COUNT(*)::text as player_count,
    '8 ⭐' as price_info,
    '16%' as budget_percentage
FROM public.chess_players WHERE elo >= 2000 AND elo < 2200
UNION ALL
SELECT 
    '<2000' as range,
    COUNT(*)::text as player_count,
    '3 ⭐' as price_info,
    '6%' as budget_percentage
FROM public.chess_players WHERE elo < 2000; 