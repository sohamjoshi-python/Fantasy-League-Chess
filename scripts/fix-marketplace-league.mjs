import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMarketplaceLeague() {
  try {
    console.log('🔧 Fixing marketplace league assignments...\n');

    // Get all leagues
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name');

    if (leaguesError) throw new Error(leaguesError.message);

    console.log(`📊 Found ${leagues?.length || 0} leagues:`);
    leagues?.forEach(league => {
      console.log(`  - ${league.name} (${league.id})`);
    });

    // Get marketplace listings with null league_id
    const { data: nullLeagueListings, error: nullLeagueError } = await supabase
      .from('player_marketplace')
      .select('*')
      .is('league_id', null);

    if (nullLeagueError) throw new Error(nullLeagueError.message);

    console.log(`\n🛒 Found ${nullLeagueListings?.length || 0} marketplace listings with null league_id`);

    if (!nullLeagueListings || nullLeagueListings.length === 0) {
      console.log('✅ No marketplace listings need fixing');
      return;
    }

    // For each league, create copies of the marketplace listings
    for (const league of leagues || []) {
      console.log(`\n📝 Creating marketplace listings for league: ${league.name}`);
      
      // Create marketplace entries for this league
      const leagueListings = nullLeagueListings.map(listing => ({
        player_username: listing.player_username,
        player_elo: listing.player_elo,
        price: listing.price,
        seller_id: listing.seller_id,
        seller_bot_id: listing.seller_bot_id,
        is_bot_seller: listing.is_bot_seller,
        sold_at: listing.sold_at,
        buyer_id: listing.buyer_id,
        buyer_bot_id: listing.buyer_bot_id,
        league_id: league.id
      }));

      // Insert in batches
      const batchSize = 50;
      let inserted = 0;
      
      for (let i = 0; i < leagueListings.length; i += batchSize) {
        const batch = leagueListings.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('player_marketplace')
          .insert(batch);

        if (insertError) {
          console.error(`❌ Failed to insert batch for league ${league.name}:`, insertError);
        } else {
          inserted += batch.length;
        }
      }

      console.log(`✅ Created ${inserted} marketplace listings for ${league.name}`);
    }

    // Delete the original null league_id listings
    const { error: deleteError } = await supabase
      .from('player_marketplace')
      .delete()
      .is('league_id', null);

    if (deleteError) {
      console.error('❌ Failed to delete null league_id listings:', deleteError);
    } else {
      console.log('\n🗑️ Deleted original null league_id listings');
    }

    // Show final summary
    const { data: finalCount, error: finalError } = await supabase
      .from('player_marketplace')
      .select('league_id', { count: 'exact' });

    if (!finalError && finalCount) {
      console.log(`\n📊 Final marketplace summary: ${finalCount.length} total listings`);
      
      // Group by league
      const byLeague = {};
      finalCount.forEach(listing => {
        byLeague[listing.league_id] = (byLeague[listing.league_id] || 0) + 1;
      });

      console.log('📋 Listings by league:');
      Object.entries(byLeague).forEach(([leagueId, count]) => {
        const league = leagues?.find(l => l.id === leagueId);
        console.log(`  - ${league?.name || leagueId}: ${count} listings`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixMarketplaceLeague(); 