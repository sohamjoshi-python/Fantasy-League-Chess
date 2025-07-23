import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearUserPlayers() {
  try {
    console.log('🗑️  Clearing user_players table...\n');

    // Get count before deletion
    const { count: beforeCount, error: countError } = await supabase
      .from('user_players')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to get count: ${countError.message}`);
    }

    console.log(`📊 Players in table before deletion: ${beforeCount}`);

    // Delete all players
    const { error: deleteError } = await supabase
      .from('user_players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy record

    if (deleteError) {
      throw new Error(`Failed to delete players: ${deleteError.message}`);
    }

    console.log(`✅ Successfully deleted ${beforeCount} players from user_players table`);

    // Verify deletion
    const { count: afterCount, error: afterCountError } = await supabase
      .from('user_players')
      .select('*', { count: 'exact', head: true });

    if (afterCountError) {
      console.error('Failed to get after count:', afterCountError);
    } else {
      console.log(`📊 Players remaining: ${afterCount}`);
    }

    console.log('\n🎉 user_players table cleared! Users can now properly buy players through the marketplace.');

  } catch (error) {
    console.error('Error clearing user_players:', error);
    process.exit(1);
  }
}

// Run the script
clearUserPlayers(); 