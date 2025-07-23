import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPlayerCount() {
  try {
    console.log('🔍 Checking chess players count...\n');

    // Method 1: Get total count using count()
    const { count, error: countError } = await supabase
      .from('chess_players')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting count:', countError);
    } else {
      console.log(`📊 Total players in database: ${count}`);
    }

    // Method 2: Fetch all players with pagination to verify
    console.log('\n🔄 Fetching all players with pagination...');
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

    console.log(`\n✅ Total players fetched via pagination: ${allPlayers.length}`);

    // Show some sample players
    console.log('\n📋 Sample players (first 5):');
    allPlayers.slice(0, 5).forEach((player, index) => {
      console.log(`   ${index + 1}. ${player.name} (ELO: ${player.elo})`);
    });

    // Show ELO distribution
    console.log('\n📈 ELO distribution:');
    const eloRanges = {
      '3400+': 0,
      '3300-3399': 0,
      '3200-3299': 0,
      '3100-3199': 0,
      '3000-3099': 0,
      '2900-2999': 0,
      '2800-2899': 0,
      '2700-2799': 0,
      '<2700': 0
    };

    allPlayers.forEach(player => {
      if (player.elo >= 3400) eloRanges['3400+']++;
      else if (player.elo >= 3300) eloRanges['3300-3399']++;
      else if (player.elo >= 3200) eloRanges['3200-3299']++;
      else if (player.elo >= 3100) eloRanges['3100-3199']++;
      else if (player.elo >= 3000) eloRanges['3000-3099']++;
      else if (player.elo >= 2900) eloRanges['2900-2999']++;
      else if (player.elo >= 2800) eloRanges['2800-2899']++;
      else if (player.elo >= 2700) eloRanges['2700-2799']++;
      else eloRanges['<2700']++;
    });

    Object.entries(eloRanges).forEach(([range, count]) => {
      if (count > 0) {
        console.log(`   ${range}: ${count} players`);
      }
    });

    console.log('\n✅ Player count check completed!');

  } catch (error) {
    console.error('❌ Error checking player count:', error);
    process.exit(1);
  }
}

checkPlayerCount(); 