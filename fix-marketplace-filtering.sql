-- Fix marketplace filtering to exclude players owned by any league member
-- This updates the get_marketplace_listings function to properly filter out owned players

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_marketplace_listings(UUID);

-- Create the updated function that filters out owned players
CREATE OR REPLACE FUNCTION public.get_marketplace_listings(league_uuid UUID)
RETURNS TABLE (
    listing_id UUID,
    player_id UUID,
    player_name TEXT,
    player_elo INTEGER,
    player_country TEXT,
    price INTEGER,
    seller_name TEXT,
    listed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.id,
        pm.player_id,
        cp.name,
        cp.elo,
        cp.country,
        pm.price,
        COALESCE(lm.display_name, b.name, 'System') as seller_name,
        pm.listed_at
    FROM public.player_marketplace pm
    JOIN public.chess_players cp ON pm.player_username = cp.name
    LEFT JOIN public.league_members lm ON pm.seller_id = lm.user_id AND lm.league_id = league_uuid
    LEFT JOIN public.bots b ON pm.seller_bot_id = b.id
    WHERE pm.league_id = league_uuid 
    AND pm.sold_at IS NULL
    -- Filter out players that are already owned by any member in this league
    AND NOT EXISTS (
        SELECT 1 FROM public.user_players up
        WHERE up.league_id = league_uuid
        AND up.player_username = pm.player_username
    )
    ORDER BY cp.elo DESC, pm.listed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function for a specific league
-- Replace 'YOUR_LEAGUE_ID' with an actual league ID to test
-- SELECT * FROM public.get_marketplace_listings('YOUR_LEAGUE_ID') LIMIT 10; 