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

async function populateMarketplace() {
  try {
    console.log('Starting marketplace population...');

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

    // Create marketplace listings for each player
    let listingsCreated = 0;
    for (const player of chessPlayers) {
      const price = calculatePlayerPrice(player.elo);
      
      const { error } = await supabase.rpc('list_player_on_marketplace', {
        p_player_username: player.name,
        p_player_elo: player.elo,
        p_price: price,
        p_seller_id: null, // System-generated listing
        p_seller_bot_id: null
      });

      if (error) {
        console.error(`Failed to list ${player.name}:`, error);
      } else {
        console.log(`Listed ${player.name} (ELO: ${player.elo}) for ${price} coins`);
        listingsCreated++;
      }
    }

    console.log(`Successfully created ${listingsCreated} marketplace listings!`);
  } catch (error) {
    console.error('Error populating marketplace:', error);
    process.exit(1);
  }
}

// Run the population
populateMarketplace(); 