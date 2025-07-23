import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugMarketplaceOwnership() {
  try {
    console.log('🔍 Debugging marketplace and ownership...\n');

    // Check marketplace
    const { data: marketplace, error: marketplaceError } = await supabase
      .from('player_marketplace')
      .select('*')
      .limit(5);

    if (marketplaceError) throw new Error(marketplaceError.message);

    console.log(`📊 Marketplace players: ${marketplace?.length || 0}`);
    if (marketplace && marketplace.length > 0) {
      console.log('Sample marketplace players:');
      marketplace.forEach(p => {
        console.log(`  - ${p.player_username} (ELO: ${p.player_elo}, Price: ${p.price})`);
      });
    }

    // Check user_players
    const { data: userPlayers, error: userPlayersError } = await supabase
      .from('user_players')
      .select('*')
      .limit(10);

    if (userPlayersError) throw new Error(userPlayersError.message);

    console.log(`\n👥 User players: ${userPlayers?.length || 0}`);
    if (userPlayers && userPlayers.length > 0) {
      console.log('Sample user players:');
      userPlayers.forEach(p => {
        console.log(`  - ${p.player_username} (ELO: ${p.player_elo}, League: ${p.league_id}, Price: ${p.purchase_price})`);
      });
    }

    // Check chess_players (all available players)
    const { data: allPlayers, error: allPlayersError } = await supabase
      .from('chess_players')
      .select('*')
      .limit(5);

    if (allPlayersError) throw new Error(allPlayersError.message);

    console.log(`\n♟️  Total chess players: ${allPlayers?.length || 0}`);
    if (allPlayers && allPlayers.length > 0) {
      console.log('Sample chess players:');
      allPlayers.forEach(p => {
        console.log(`  - ${p.name} (ELO: ${p.elo})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugMarketplaceOwnership(); 