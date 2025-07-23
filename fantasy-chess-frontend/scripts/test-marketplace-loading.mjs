import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMarketplaceLoading() {
  try {
    console.log('🧪 Testing marketplace player loading...\n');

    // Simulate the loadAvailablePlayers function logic
    console.log('🔄 Loading all chess players with pagination...');
    
    let allPlayers = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: players, error: playersError } = await supabase
        .from('chess_players')
        .select('*')
        .order('elo', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (playersError) {
        console.error(`Error fetching page ${page + 1}:`, playersError);
        break;
      }

      if (players && players.length > 0) {
        allPlayers = allPlayers.concat(players);
        console.log(`   Page ${page + 1}: ${players.length} players (total so far: ${allPlayers.length})`);
        page++;
      } else {
        hasMore = false;
      }

      // Safety check
      if (page > 10) {
        console.warn('⚠️  Reached maximum page limit, stopping pagination');
        hasMore = false;
      }
    }

    console.log(`✅ Total players loaded: ${allPlayers.length}`);

    // Get league info to simulate filtering
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, marketplace_started')
      .eq('marketplace_started', true)
      .limit(1);

    if (leaguesError) {
      console.error('Error fetching leagues:', leaguesError);
      return;
    }

    if (leagues && leagues.length > 0) {
      const league = leagues[0];
      console.log(`\n🏆 Testing with league: ${league.name} (${league.id})`);

      // Get teams to see owned players
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('league_id', league.id);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return;
      }

      // Create set of owned player IDs
      const ownedPlayerIds = new Set();
      allTeams?.forEach(team => {
        team.player_ids?.forEach(id => ownedPlayerIds.add(id));
      });

      console.log(`   Owned players in league: ${ownedPlayerIds.size}`);

      // Filter out owned players
      const available = allPlayers.filter(player => !ownedPlayerIds.has(player.id));
      console.log(`   Available players after filtering: ${available.length}`);

      // Test sorting by affordability (simulate user with 50 coins)
      const userCoinBalance = 50;
      const sortedPlayers = available
        .sort((a, b) => {
          const priceA = calculatePlayerPrice(a.elo);
          const priceB = calculatePlayerPrice(b.elo);
          const canAffordA = userCoinBalance >= priceA;
          const canAffordB = userCoinBalance >= priceB;
          
          // Sort by affordability first (affordable players first)
          if (canAffordA && !canAffordB) return -1;
          if (!canAffordA && canAffordB) return 1;
          
          // Then sort by ELO (highest first)
          return b.elo - a.elo;
        });

      const affordableCount = sortedPlayers.filter(p => userCoinBalance >= calculatePlayerPrice(p.elo)).length;
      console.log(`\n💰 With ${userCoinBalance} coins:`);
      console.log(`   Affordable players: ${affordableCount}`);
      console.log(`   Unaffordable players: ${sortedPlayers.length - affordableCount}`);

      // Show top 5 affordable players
      console.log('\n📋 Top 5 affordable players:');
      sortedPlayers
        .filter(p => userCoinBalance >= calculatePlayerPrice(p.elo))
        .slice(0, 5)
        .forEach((player, index) => {
          const price = calculatePlayerPrice(player.elo);
          console.log(`   ${index + 1}. ${player.name} (ELO: ${player.elo}, Price: ${price} 🪙)`);
        });

    } else {
      console.log('No leagues with marketplace started found.');
    }

    console.log('\n✅ Marketplace loading test completed!');

  } catch (error) {
    console.error('❌ Error testing marketplace loading:', error);
    process.exit(1);
  }
}

// Helper function to calculate player price (same as in frontend)
function calculatePlayerPrice(elo) {
  if (elo >= 3400) return 50;      // Elite tier
  if (elo >= 3300) return 40;      // Strong tier
  if (elo >= 3200) return 30;      // Good tier
  if (elo >= 3100) return 20;      // Average tier
  if (elo >= 3000) return 15;      // Developing tier
  return 10;                       // Beginner tier
}

testMarketplaceLoading(); 