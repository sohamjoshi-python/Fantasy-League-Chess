import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Pricing function based on chess.com ELO
function calculatePlayerPrice(elo) {
  if (elo >= 3200) return 50; // Legendary
  if (elo >= 3100) return 40; // Elite
  if (elo >= 3000) return 30; // Super Strong
  if (elo >= 2900) return 20; // Strong
  if (elo >= 2700) return 15; // Good
  if (elo >= 2400) return 10; // Average
  return 5; // Developing
}

async function populateMarketplaceComplete() {
  try {
    console.log('Starting complete marketplace population...');

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

    // Get all chess players with pagination
    let allPlayers = [];
    let page = 0;
    const pageSize = 1000;
    
    console.log('Fetching all chess players...');
    while (true) {
      const { data: players, error: playersError } = await supabase
        .from('chess_players')
        .select('name, elo')
        .order('elo', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (playersError) {
        throw new Error(`Failed to fetch players page ${page}: ${playersError.message}`);
      }

      if (!players || players.length === 0) {
        break;
      }

      allPlayers = allPlayers.concat(players);
      console.log(`📄 Page ${page + 1}: ${players.length} players (total so far: ${allPlayers.length})`);
      
      if (players.length < pageSize) {
        break; // Last page
      }
      
      page++;
    }

    console.log(`\n✅ Total chess players fetched: ${allPlayers.length}`);

    // Create marketplace listings in batches
    let listingsCreated = 0;
    const batchSize = 50; // Process in batches to avoid overwhelming the database
    
    console.log('\nCreating marketplace listings...');
    for (let i = 0; i < allPlayers.length; i += batchSize) {
      const batch = allPlayers.slice(i, i + batchSize);
      
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
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} players`);
        listingsCreated += batch.length;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 Successfully created ${listingsCreated} marketplace listings!`);
    
    // Verify the insertions
    console.log('\n🔍 Verifying marketplace...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('player_marketplace')
      .select('*')
      .is('sold_at', null);

    if (verifyError) {
      console.error('Error verifying insertions:', verifyError);
    } else {
      console.log(`✅ Verification: ${verifyData.length} active listings in database`);
      
      if (verifyData.length === allPlayers.length) {
        console.log('🎯 Perfect! All players are now in the marketplace.');
      } else {
        console.log(`⚠️ Warning: Expected ${allPlayers.length} but found ${verifyData.length} listings`);
      }
    }

  } catch (error) {
    console.error('Error populating marketplace:', error);
    process.exit(1);
  }
}

// Run the population
populateMarketplaceComplete(); 