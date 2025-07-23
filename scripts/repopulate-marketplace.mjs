import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function repopulateMarketplace() {
  try {
    console.log('🔄 Repopulating marketplace...\n');

    // First, clear the marketplace
    const { error: deleteError } = await supabase
      .from('player_marketplace')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) throw new Error(deleteError.message);
    console.log('✅ Cleared existing marketplace');

    // Get all chess players
    const { data: chessPlayers, error: chessError } = await supabase
      .from('chess_players')
      .select('*')
      .not('name', 'is', null)
      .neq('name', '')
      .not('name', 'ilike', '%unknown%')
      .not('name', 'ilike', '%test%')
      .not('name', 'ilike', '%TestPlayer%');

    if (chessError) throw new Error(chessError.message);

    console.log(`📊 Found ${chessPlayers?.length || 0} valid chess players`);

    // Calculate prices and prepare marketplace entries
    const marketplaceEntries = (chessPlayers || []).map(player => {
      let price;
      if (player.elo >= 3300) price = 50;      // Elite (Magnus level)
      else if (player.elo >= 3200) price = 40; // Super Grandmaster
      else if (player.elo >= 3100) price = 30; // Grandmaster
      else if (player.elo >= 3000) price = 25; // Strong International Master
      else if (player.elo >= 2900) price = 20; // International Master
      else if (player.elo >= 2800) price = 15; // FIDE Master
      else if (player.elo >= 2700) price = 10; // Candidate Master
      else price = 5;                          // Club player

      return {
        player_username: player.name,
        player_elo: player.elo,
        price: price,
        league_id: null // Available in all leagues
      };
    });

    // Insert into marketplace
    const { data: inserted, error: insertError } = await supabase
      .from('player_marketplace')
      .insert(marketplaceEntries)
      .select();

    if (insertError) throw new Error(insertError.message);

    console.log(`✅ Added ${inserted?.length || 0} players to marketplace`);

    // Show summary
    const { data: summary } = await supabase
      .from('player_marketplace')
      .select('price');

    if (summary) {
      const avgPrice = summary.reduce((sum, p) => sum + p.price, 0) / summary.length;
      const minPrice = Math.min(...summary.map(p => p.price));
      const maxPrice = Math.max(...summary.map(p => p.price));

      console.log('\n📋 Marketplace Summary:');
      console.log(`  Total players: ${summary.length}`);
      console.log(`  Average price: ${avgPrice.toFixed(1)} ⭐`);
      console.log(`  Price range: ${minPrice} - ${maxPrice} ⭐`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

repopulateMarketplace(); 