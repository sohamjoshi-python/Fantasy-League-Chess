importdotenv/config;
import { createClient } from '@supabase/supabase-js;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugMarketplaceFiltering() {
  try[object Object]
    console.log('🔍 Debugging marketplace filtering...\n');

    // Get a sample league
    const { data: leagues, error: leaguesError } = await supabase
      .from(leagues)
      .select('id, name')
      .limit(1);

    if (leaguesError) throw new Error(leaguesError.message);

    if (!leagues || leagues.length === 0
      console.log('❌ No leagues found);
      return;
    }

    const leagueId = leagues[0].id;
    const leagueName = leagues[0].name;

    console.log(`📊 Testing league: ${leagueName} (${leagueId})\n`);

    // Check total marketplace listings for this league
    const { data: totalMarketplace, error: totalError } = await supabase
      .from('player_marketplace)   .select('player_username')
      .eq('league_id, leagueId)
      .is('sold_at', null);

    if (totalError) throw new Error(totalError.message);

    console.log(`🛒 Total marketplace listings: ${totalMarketplace?.length || 0}`);

    // Check owned players in this league
    const { data: ownedPlayers, error: ownedError } = await supabase
      .from('user_players)   .select('player_username')
      .eq('league_id,leagueId);

    if (ownedError) throw new Error(ownedError.message);

    console.log(`👥 Total owned players: ${ownedPlayers?.length || 0

    // Show some owned players
    if (ownedPlayers && ownedPlayers.length > 0
      console.log(n📋 Sample owned players:');
      ownedPlayers.slice(0, 10.forEach(player =>[object Object]       console.log(`  - ${player.player_username}`);
      });
      if (ownedPlayers.length > 10)[object Object]       console.log(`  ... and ${ownedPlayers.length -10} more`);
      }
    }

    // Test the get_marketplace_listings function
    console.log('\n🧪 Testing get_marketplace_listings function...');
    const { data: filteredListings, error: filteredError } = await supabase
      .rpc('get_marketplace_listings', { league_uuid: leagueId });

    if (filteredError) {
      console.error('❌ Function error:', filteredError);
    } else {
      console.log(`✅ Filtered marketplace listings: ${filteredListings?.length || 0);
      
      if (filteredListings && filteredListings.length > 0)[object Object]       console.log('\n📋 Sample filtered listings:');
        filteredListings.slice(05forEach(listing => {
          console.log(`  - ${listing.player_name} (ELO: ${listing.player_elo})`);
        });
      }
    }

    // Check for conflicts - players that appear in both marketplace and owned
    if (totalMarketplace && ownedPlayers) {
      const marketplaceUsernames = new Set(totalMarketplace.map(p => p.player_username));
      const ownedUsernames = new Set(ownedPlayers.map(p => p.player_username));
      
      const conflicts = totalMarketplace.filter(p => ownedUsernames.has(p.player_username));
      
      console.log(`\n⚠️  Conflicts found: ${conflicts.length} players in both marketplace and owned`);
      
      if (conflicts.length > 0)[object Object]       console.log('📋 Conflicting players:');
        conflicts.slice(0, 10.forEach(player => {
          console.log(`  - ${player.player_username}`);
        });
      }
    }

    // Check if the function is working correctly
    const expectedAvailable = (totalMarketplace?.length || 0 - (ownedPlayers?.length || 0);
    const actualAvailable = filteredListings?.length || 0;
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total marketplace: ${totalMarketplace?.length ||0);
    console.log(`  Total owned: ${ownedPlayers?.length ||0);
    console.log(`  Expected available: ${expectedAvailable}`);
    console.log(`  Actual available: ${actualAvailable}`);
    
    if (actualAvailable !== expectedAvailable) {
      console.log(`❌ Mismatch! Expected $[object Object]expectedAvailable} but got ${actualAvailable}`);
    } else {
      console.log(`✅ Filtering working correctly!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugMarketplaceFiltering(); 