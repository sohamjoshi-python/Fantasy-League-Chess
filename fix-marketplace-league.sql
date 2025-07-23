-- Fix marketplace league assignments
-- This script creates league-specific marketplace listings

-- First, let's see what leagues we have
SELECT 'Current leagues:' as info;
SELECT id, name FROM leagues ORDER BY name;

-- Get count of marketplace listings with null league_id
SELECT 'Marketplace listings with null league_id:' as info, COUNT(*) as count 
FROM player_marketplace 
WHERE league_id IS NULL;

-- For each league, create copies of the marketplace listings
DO $$
DECLARE
    league_record RECORD;
    listing_record RECORD;
BEGIN
    -- Loop through each league
    FOR league_record IN SELECT id, name FROM leagues
    LOOP
        RAISE NOTICE 'Creating marketplace listings for league: % (%)', league_record.name, league_record.id;
        
        -- Create marketplace entries for this league
        FOR listing_record IN 
            SELECT * FROM player_marketplace 
            WHERE league_id IS NULL
        LOOP
            INSERT INTO player_marketplace (
                player_username,
                player_elo,
                price,
                seller_id,
                seller_bot_id,
                is_bot_seller,
                sold_at,
                buyer_id,
                buyer_bot_id,
                league_id
            ) VALUES (
                listing_record.player_username,
                listing_record.player_elo,
                listing_record.price,
                listing_record.seller_id,
                listing_record.seller_bot_id,
                listing_record.is_bot_seller,
                listing_record.sold_at,
                listing_record.buyer_id,
                listing_record.buyer_bot_id,
                league_record.id
            );
        END LOOP;
        
        RAISE NOTICE 'Created marketplace listings for league: %', league_record.name;
    END LOOP;
    
    -- Delete the original null league_id listings
    DELETE FROM player_marketplace WHERE league_id IS NULL;
    RAISE NOTICE 'Deleted original null league_id listings';
END $$;

-- Show final summary
SELECT 'Final marketplace summary:' as info;
SELECT 
    l.name as league_name,
    COUNT(pm.id) as listings_count
FROM leagues l
LEFT JOIN player_marketplace pm ON l.id = pm.league_id
GROUP BY l.id, l.name
ORDER BY l.name; 