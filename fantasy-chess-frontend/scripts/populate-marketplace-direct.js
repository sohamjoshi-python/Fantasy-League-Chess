import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SB_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Pricing function based on ELO
function calculatePlayerPrice(elo) {
  if (elo >= 2800) return 50; // Legendary
  if (elo >= 2700) return 40; // Elite
  if (elo >= 2600) return 30; // Strong
  if (elo >= 2500) return 20; // Good
  if (elo >= 2400) return 15; // Average
  if (elo >= 2300) return 10; // Developing
  return 5; // Beginner
}

async function populateMarketplaceDirect() {
  try {
    console.log('Starting direct marketplace population...');

    // First, clear existing marketplace listings
    const { error: clearError } = await supabase
      .from('player_marketplace')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy record

    if (clearError) {
      console.error('Failed to clear marketplace:', clearError);
      return;
    }

    console.log('Cleared existing marketplace listings');

    // Get all chess players
    const { data: chessPlayers, error: playersError } = await supabase
      .from('chess_players')
      .select('name, elo')
      .order('elo', { ascending: false });

    if (playersError) {
      throw new Error(`Failed to fetch chess players: ${playersError.message}`);
    }

    console.log(`Found ${chessPlayers.length} chess players`);

    // Create marketplace listings directly
    let listingsCreated = 0;
    const batchSize = 50; // Process in batches to avoid overwhelming the database
    
    for (let i = 0; i < chessPlayers.length; i += batchSize) {
      const batch = chessPlayers.slice(i, i + batchSize);
      
      const marketplaceData = batch.map(player => ({
        player_username: player.name,
        player_elo: player.elo,
        price: calculatePlayerPrice(player.elo),
        seller_id: null, // System-generated listing
        seller_bot_id: null,
        is_bot_seller: false,
        sold_at: null,
        buyer_id: null,
        buyer_bot_id: null
      }));

      const { data, error } = await supabase
        .from('player_marketplace')
        .insert(marketplaceData);

      if (error) {
        console.error(`Failed to insert batch ${Math.floor(i/batchSize) + 1}:`, error);
        // Continue with next batch instead of stopping
      } else {
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} players`);
        listingsCreated += batch.length;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Successfully created ${listingsCreated} marketplace listings!`);
    
    // Verify the insertions
    const { data: verifyData, error: verifyError } = await supabase
      .from('player_marketplace')
      .select('count')
      .is('sold_at', null);

    if (verifyError) {
      console.error('Error verifying insertions:', verifyError);
    } else {
      console.log(`Verification: ${verifyData.length} active listings in database`);
    }

  } catch (error) {
    console.error('Error populating marketplace:', error);
    process.exit(1);
  }
}

// Run the population
populateMarketplaceDirect(); 