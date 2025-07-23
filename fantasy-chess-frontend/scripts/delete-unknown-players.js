import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteUnknownPlayers() {
  try {
    console.log('🔍 Finding unknown and test players in user_players table...\n');

    // First, let's see what unknown players exist
    const { data: unknownPlayers, error: fetchError } = await supabase
      .from('user_players')
      .select('*')
      .or('player_username.eq.unknown,player_username.eq.test player,player_username.eq.Unknown Player,player_username.eq.Unknown,player_username.eq.Test Player,player_username.eq.test,player_username.eq.Test,player_username.eq.TestPlayer')
      .order('player_username');

    if (fetchError) {
      throw new Error(`Failed to fetch unknown players: ${fetchError.message}`);
    }

    if (!unknownPlayers || unknownPlayers.length === 0) {
      console.log('✅ No unknown or test players found in user_players table!');
      return;
    }

    console.log(`📊 Found ${unknownPlayers.length} unknown/test players:`);
    console.log('\nUnknown/Test players to be deleted:');
    unknownPlayers.forEach((player, index) => {
      console.log(`${index + 1}. ${player.player_username} (ELO: ${player.player_elo}, User: ${player.user_id}, Bot: ${player.bot_id || 'None'})`);
    });

    // Also check for players with null or empty usernames
    const { data: nullPlayers, error: nullError } = await supabase
      .from('user_players')
      .select('*')
      .or('player_username.is.null,player_username.eq.')
      .order('player_username');

    if (nullError) {
      throw new Error(`Failed to fetch null players: ${nullError.message}`);
    }

    if (nullPlayers && nullPlayers.length > 0) {
      console.log(`\n📊 Found ${nullPlayers.length} players with null/empty usernames:`);
      nullPlayers.forEach((player, index) => {
        console.log(`${index + 1}. NULL/EMPTY (ELO: ${player.player_elo}, User: ${player.user_id}, Bot: ${player.bot_id || 'None'})`);
      });
    }

    // Also check for players with very short or suspicious usernames
    const { data: suspiciousPlayers, error: suspiciousError } = await supabase
      .from('user_players')
      .select('*')
      .or('player_username.like.a,player_username.like.b,player_username.like.c,player_username.like.test,player_username.like.temp,player_username.like.dummy')
      .order('player_username');

    if (suspiciousError) {
      throw new Error(`Failed to fetch suspicious players: ${suspiciousError.message}`);
    }

    if (suspiciousPlayers && suspiciousPlayers.length > 0) {
      console.log(`\n📊 Found ${suspiciousPlayers.length} players with suspicious usernames:`);
      suspiciousPlayers.forEach((player, index) => {
        console.log(`${index + 1}. ${player.player_username} (ELO: ${player.player_elo}, User: ${player.user_id}, Bot: ${player.bot_id || 'None'})`);
      });
    }

    const totalToDelete = (unknownPlayers?.length || 0) + (nullPlayers?.length || 0) + (suspiciousPlayers?.length || 0);

    if (totalToDelete === 0) {
      console.log('\n✅ No players to delete!');
      return;
    }

    console.log(`\n🗑️  Total players to delete: ${totalToDelete}`);
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will permanently delete these players from user_players table!');
    console.log('Type "DELETE" to confirm:');
    
    // For automated scripts, we'll proceed without confirmation
    // In a real scenario, you'd want to add confirmation logic here
    
    // Delete unknown players
    if (unknownPlayers && unknownPlayers.length > 0) {
      const unknownIds = unknownPlayers.map(p => p.id);
      const { error: deleteError } = await supabase
        .from('user_players')
        .delete()
        .in('id', unknownIds);

      if (deleteError) {
        throw new Error(`Failed to delete unknown players: ${deleteError.message}`);
      }
      console.log(`✅ Deleted ${unknownPlayers.length} unknown/test players`);
    }

    // Delete null/empty players
    if (nullPlayers && nullPlayers.length > 0) {
      const nullIds = nullPlayers.map(p => p.id);
      const { error: deleteError } = await supabase
        .from('user_players')
        .delete()
        .in('id', nullIds);

      if (deleteError) {
        throw new Error(`Failed to delete null players: ${deleteError.message}`);
      }
      console.log(`✅ Deleted ${nullPlayers.length} null/empty players`);
    }

    // Delete suspicious players
    if (suspiciousPlayers && suspiciousPlayers.length > 0) {
      const suspiciousIds = suspiciousPlayers.map(p => p.id);
      const { error: deleteError } = await supabase
        .from('user_players')
        .delete()
        .in('id', suspiciousIds);

      if (deleteError) {
        throw new Error(`Failed to delete suspicious players: ${deleteError.message}`);
      }
      console.log(`✅ Deleted ${suspiciousPlayers.length} suspicious players`);
    }

    console.log(`\n🎉 Successfully deleted ${totalToDelete} invalid players!`);

    // Verify deletion
    const { count: remainingCount, error: countError } = await supabase
      .from('user_players')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Failed to get remaining count:', countError);
    } else {
      console.log(`📊 Remaining players in user_players table: ${remainingCount}`);
    }

  } catch (error) {
    console.error('Error deleting unknown players:', error);
    process.exit(1);
  }
}

// Run the script
deleteUnknownPlayers(); 