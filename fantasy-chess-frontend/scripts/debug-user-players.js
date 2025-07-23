import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUserPlayers() {
  try {
    console.log('🔍 Debugging user_players table...\n');

    // Get all user_players
    const { data: allPlayers, error: fetchError } = await supabase
      .from('user_players')
      .select('*')
      .order('purchased_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch user_players: ${fetchError.message}`);
    }

    console.log(`📊 Total players in user_players table: ${allPlayers.length}`);

    // Group by user
    const playersByUser = {};
    allPlayers.forEach(player => {
      const userId = player.user_id || `bot_${player.bot_id}`;
      if (!playersByUser[userId]) {
        playersByUser[userId] = [];
      }
      playersByUser[userId].push(player);
    });

    console.log('\n📋 Players by user:');
    Object.entries(playersByUser).forEach(([userId, players]) => {
      console.log(`\n👤 User: ${userId} (${players.length} players)`);
      players.forEach(player => {
        console.log(`  - ${player.player_username} (ELO: ${player.player_elo}, Price: ${player.purchase_price}, Date: ${player.purchased_at})`);
      });
    });

    // Check for players with purchase_price = 0 (these might be migrated from old teams)
    const freePlayers = allPlayers.filter(p => p.purchase_price === 0);
    if (freePlayers.length > 0) {
      console.log(`\n⚠️  Found ${freePlayers.length} players with purchase_price = 0 (likely migrated from old teams):`);
      freePlayers.forEach(player => {
        console.log(`  - ${player.player_username} (User: ${player.user_id}, Bot: ${player.bot_id})`);
      });
    }

    // Check for duplicate players per user
    const duplicates = {};
    Object.entries(playersByUser).forEach(([userId, players]) => {
      const playerCounts = {};
      players.forEach(player => {
        const key = player.player_username;
        playerCounts[key] = (playerCounts[key] || 0) + 1;
      });
      
      const userDuplicates = Object.entries(playerCounts).filter(([name, count]) => count > 1);
      if (userDuplicates.length > 0) {
        duplicates[userId] = userDuplicates;
      }
    });

    if (Object.keys(duplicates).length > 0) {
      console.log('\n🚨 Found duplicate players:');
      Object.entries(duplicates).forEach(([userId, dups]) => {
        console.log(`\n👤 User: ${userId}`);
        dups.forEach(([name, count]) => {
          console.log(`  - ${name}: ${count} copies`);
        });
      });
    }

  } catch (error) {
    console.error('Error debugging user_players:', error);
    process.exit(1);
  }
}

// Run the script
debugUserPlayers(); 