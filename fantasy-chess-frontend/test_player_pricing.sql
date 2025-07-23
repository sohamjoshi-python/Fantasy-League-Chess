-- Test query to show player pricing based on chess.com ELO
-- This shows how the calculate_player_price function works

SELECT 
    cp.name,
    cp.elo as chess_com_elo,
    cp.country,
    -- Calculate price using the new strategic chess.com ELO formula
    CASE 
        WHEN cp.elo >= 3000 THEN 50
        WHEN cp.elo >= 2800 THEN 40
        WHEN cp.elo >= 2600 THEN 30
        WHEN cp.elo >= 2400 THEN 20
        WHEN cp.elo >= 2200 THEN 12
        WHEN cp.elo >= 2000 THEN 8
        ELSE 3
    END as calculated_price,
    -- Show the tier breakdown
    CASE 
        WHEN cp.elo >= 3000 THEN 'Super Elite (3000+) - Entire Budget'
        WHEN cp.elo >= 2800 THEN 'Elite (2800-2999) - Major Investment'
        WHEN cp.elo >= 2600 THEN 'Strong (2600-2799) - Significant Cost'
        WHEN cp.elo >= 2400 THEN 'Good (2400-2599) - Moderate Investment'
        WHEN cp.elo >= 2200 THEN 'Decent (2200-2399) - Affordable'
        WHEN cp.elo >= 2000 THEN 'Average (2000-2199) - Budget-Friendly'
        ELSE 'Minimum (<2000) - Value Pick'
    END as price_tier
FROM public.chess_players cp
ORDER BY cp.elo DESC;

-- Alternative: Show strategic chess.com ELO price tiers
SELECT 
    'Chess.com ELO Range' as category,
    'Price' as price_info,
    'Strategic Impact' as examples
UNION ALL
SELECT 
    '3000+' as category,
    '50 ⭐' as price_info,
    'Entire week budget - major commitment' as examples
UNION ALL
SELECT 
    '2800-2999' as category,
    '40 ⭐' as price_info,
    'Major investment - 80% of budget' as examples
UNION ALL
SELECT 
    '2600-2799' as category,
    '30 ⭐' as price_info,
    'Significant cost - 60% of budget' as examples
UNION ALL
SELECT 
    '2400-2599' as category,
    '20 ⭐' as price_info,
    'Moderate investment - 40% of budget' as examples
UNION ALL
SELECT 
    '2200-2399' as category,
    '12 ⭐' as price_info,
    'Affordable - 24% of budget' as examples
UNION ALL
SELECT 
    '2000-2199' as category,
    '8 ⭐' as price_info,
    'Budget-friendly - 16% of budget' as examples
UNION ALL
SELECT 
    '<2000' as category,
    '3 ⭐' as price_info,
    'Value pick - 6% of budget' as examples; 