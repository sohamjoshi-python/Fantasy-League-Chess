import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMarketplace() {
  try {
    console.log('Checking marketplace status...\n');

    // Get total chess players with pagination
    let allPlayers = [];
    let playersPage = 0;
    const playersPageSize = 1000;
    
    while (true) {
      const { data: players, error: playersError } = await supabase
        .from('chess_players')
        .select('name, elo')
        .order('elo', { ascending: false })
        .range(playersPage * playersPageSize, (playersPage + 1) * playersPageSize - 1);

      if (playersError) {
        throw new Error(`Failed to fetch chess players: ${playersError.message}`);
      }

      if (!players || players.length === 0) {
        break;
      }

      allPlayers = allPlayers.concat(players);
      
      if (players.length < playersPageSize) {
        break; // Last page
      }
      
      playersPage++;
    }

    // Get marketplace listings with pagination
    let marketplaceListings = [];
    let marketplacePage = 0;
    const marketplacePageSize = 1000;
    
    while (true) {
      const { data: listings, error: marketplaceError } = await supabase
        .from('player_marketplace')
        .select('player_username, player_elo')
        .is('sold_at', null)
        .range(marketplacePage * marketplacePageSize, (marketplacePage + 1) * marketplacePageSize - 1);

      if (marketplaceError) {
        throw new Error(`Failed to fetch marketplace: ${marketplaceError.message}`);
      }

      if (!listings || listings.length === 0) {
        break;
      }

      marketplaceListings = marketplaceListings.concat(listings);
      
      if (listings.length < marketplacePageSize) {
        break; // Last page
      }
      
      marketplacePage++;
    }

    console.log(`📊 Total chess players in database: ${allPlayers.length}`);
    console.log(`🛒 Active marketplace listings: ${marketplaceListings.length}`);
    console.log(`❌ Missing from marketplace: ${allPlayers.length - marketplaceListings.length}\n`);

    // Create sets for easy comparison
    const marketplaceUsernames = new Set(marketplaceListings.map(p => p.player_username));
    const allUsernames = new Set(allPlayers.map(p => p.name));

    // Find missing players
    const missingPlayers = allPlayers.filter(player => !marketplaceUsernames.has(player.name));

    if (missingPlayers.length > 0) {
      console.log('🔍 Missing players from marketplace:');
      missingPlayers.slice(0, 20).forEach(player => {
        console.log(`  - ${player.name} (ELO: ${player.elo})`);
      });
      
      if (missingPlayers.length > 20) {
        console.log(`  ... and ${missingPlayers.length - 20} more`);
      }
    }

    // Show some marketplace stats
    console.log('\n📈 Marketplace Statistics (Chess.com ELO):');
    const priceRanges = {
      '50 coins (3200+)': 0,
      '40 coins (3100-3199)': 0,
      '30 coins (3000-3099)': 0,
      '20 coins (2900-2999)': 0,
      '15 coins (2700-2899)': 0,
      '10 coins (2400-2699)': 0,
      '5 coins (<2400)': 0
    };

    marketplaceListings.forEach(listing => {
      if (listing.player_elo >= 3200) priceRanges['50 coins (3200+)']++;
      else if (listing.player_elo >= 3100) priceRanges['40 coins (3100-3199)']++;
      else if (listing.player_elo >= 3000) priceRanges['30 coins (3000-3099)']++;
      else if (listing.player_elo >= 2900) priceRanges['20 coins (2900-2999)']++;
      else if (listing.player_elo >= 2700) priceRanges['15 coins (2700-2899)']++;
      else if (listing.player_elo >= 2400) priceRanges['10 coins (2400-2699)']++;
      else priceRanges['5 coins (<2400)']++;
    });

    Object.entries(priceRanges).forEach(([range, count]) => {
      console.log(`  ${range}: ${count} players`);
    });

  } catch (error) {
    console.error('Error checking marketplace:', error);
    process.exit(1);
  }
}

// Run the check
checkMarketplace(); 