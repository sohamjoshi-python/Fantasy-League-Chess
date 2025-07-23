import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateOldLeaguePlayers() {
  try {
    console.log('Starting migration of old league players...\n');

    // Get all teams with player_ids
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        user_id,
        league_id,
        player_ids,
        leagues (
          id,
          name,
          draft_completed
        )
      `)
      .not('player_ids', 'is', null);

    if (teamsError) {
      throw new Error(`Failed to fetch teams: ${teamsError.message}`);
    }

    console.log(`Found ${teams.length} teams with player data`);

    let totalPlayersMigrated = 0;
    let teamsProcessed = 0;

    for (const team of teams) {
      if (!team.player_ids || team.player_ids.length === 0) {
        continue;
      }

      console.log(`\nProcessing team ${team.id} in league "${team.leagues?.name}" (${team.player_ids.length} players)`);

      // Get the chess players for this team
      const { data: chessPlayers, error: playersError } = await supabase
        .from('chess_players')
        .select('id, name, elo')
        .in('id', team.player_ids);

      if (playersError) {
        console.error(`Failed to fetch chess players for team ${team.id}:`, playersError);
        continue;
      }

      if (!chessPlayers || chessPlayers.length === 0) {
        console.log(`No chess players found for team ${team.id}`);
        continue;
      }

      // Check if players are already in user_players table
      const { data: existingPlayers, error: existingError } = await supabase
        .from('user_players')
        .select('player_username')
        .eq('user_id', team.user_id)
        .in('player_username', chessPlayers.map(p => p.name));

      if (existingError) {
        console.error(`Failed to check existing players for team ${team.id}:`, existingError);
        continue;
      }

      const existingUsernames = new Set(existingPlayers?.map(p => p.player_username) || []);
      const newPlayers = chessPlayers.filter(player => !existingUsernames.has(player.name));

      if (newPlayers.length === 0) {
        console.log(`All players for team ${team.id} already exist in user_players table`);
        teamsProcessed++;
        continue;
      }

      console.log(`Migrating ${newPlayers.length} new players for team ${team.id}`);

      // Insert new players into user_players table
      const userPlayersData = newPlayers.map(player => ({
        user_id: team.user_id,
        bot_id: null,
        player_username: player.name,
        player_elo: player.elo,
        purchase_price: 0, // These were drafted, not purchased
        purchased_at: new Date().toISOString()
      }));

      const { data: insertedPlayers, error: insertError } = await supabase
        .from('user_players')
        .insert(userPlayersData);

      if (insertError) {
        console.error(`Failed to insert players for team ${team.id}:`, insertError);
        continue;
      }

      console.log(`✅ Successfully migrated ${newPlayers.length} players for team ${team.id}`);
      totalPlayersMigrated += newPlayers.length;
      teamsProcessed++;

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Teams processed: ${teamsProcessed}`);
    console.log(`👥 Total players migrated: ${totalPlayersMigrated}`);

  } catch (error) {
    console.error('Error migrating old league players:', error);
    process.exit(1);
  }
}

// Run the migration
migrateOldLeaguePlayers(); 