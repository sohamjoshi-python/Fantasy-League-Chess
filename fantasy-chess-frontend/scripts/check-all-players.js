import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllPlayers() {
  try {
    console.log('🔍 Checking all chess players in database...\n');

    // Get total count first
    const { count: totalCount, error: countError } = await supabase
      .from('chess_players')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to get count: ${countError.message}`);
    }

    console.log(`📊 Total chess players in database: ${totalCount}`);

    // Get all players with pagination
    let allPlayers = [];
    let page = 0;
    const pageSize = 1000;
    
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

    console.log(`\n✅ Total players fetched: ${allPlayers.length}`);
    console.log(`📊 Expected total: ${totalCount}`);
    console.log(`❌ Difference: ${totalCount - allPlayers.length}`);

    // Show ELO distribution
    console.log('\n📈 ELO Distribution:');
    const eloRanges = {
      '2800+': 0,
      '2700-2799': 0,
      '2600-2699': 0,
      '2500-2599': 0,
      '2400-2499': 0,
      '2300-2399': 0,
      '<2300': 0
    };

    allPlayers.forEach(player => {
      if (player.elo >= 2800) eloRanges['2800+']++;
      else if (player.elo >= 2700) eloRanges['2700-2799']++;
      else if (player.elo >= 2600) eloRanges['2600-2699']++;
      else if (player.elo >= 2500) eloRanges['2500-2599']++;
      else if (player.elo >= 2400) eloRanges['2400-2499']++;
      else if (player.elo >= 2300) eloRanges['2300-2399']++;
      else eloRanges['<2300']++;
    });

    Object.entries(eloRanges).forEach(([range, count]) => {
      console.log(`  ${range}: ${count} players`);
    });

    // Show some sample players
    console.log('\n👥 Sample players (highest ELO):');
    allPlayers.slice(0, 10).forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.name} (ELO: ${player.elo})`);
    });

    console.log('\n👥 Sample players (lowest ELO):');
    allPlayers.slice(-10).forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.name} (ELO: ${player.elo})`);
    });

  } catch (error) {
    console.error('Error checking all players:', error);
    process.exit(1);
  }
}

// Run the check
checkAllPlayers(); 