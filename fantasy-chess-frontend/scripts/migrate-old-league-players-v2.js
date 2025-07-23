import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateOldLeaguePlayersV2() {
  try {
    console.log('🔄 Migrating old league players to league-specific user_players...\n');

    // First, run the database migration function
    console.log('📊 Running database migration function...');
    const { error: migrationError } = await supabase.rpc('migrate_old_league_players');
    
    if (migrationError) {
      console.error('Database migration failed:', migrationError);
      throw migrationError;
    }

    console.log('✅ Database migration completed');

    // Now let's verify the migration by checking the results
    console.log('\n🔍 Verifying migration results...');

    // Get all teams with players
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        user_id,
        league_id,
        player_ids,
        leagues!inner(name)
      `)
      .not('player_ids', 'is', null);

    if (teamsError) {
      throw new Error(`Failed to fetch teams: ${teamsError.message}`);
    }

    console.log(`📊 Found ${teams.length} teams with players`);

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

      // Check if players are already in user_players table for this league
      const { data: existingPlayers, error: existingError } = await supabase
        .from('user_players')
        .select('player_username')
        .eq('user_id', team.user_id)
        .eq('league_id', team.league_id)
        .in('player_username', chessPlayers.map(p => p.name));

      if (existingError) {
        console.error(`Failed to check existing players for team ${team.id}:`, existingError);
        continue;
      }

      const existingUsernames = new Set(existingPlayers?.map(p => p.player_username) || []);
      const newPlayers = chessPlayers.filter(player => !existingUsernames.has(player.name));

      if (newPlayers.length === 0) {
        console.log(`All players for team ${team.id} already exist in user_players table for this league`);
        teamsProcessed++;
        continue;
      }

      console.log(`Migrating ${newPlayers.length} new players for team ${team.id}`);

      // Insert new players into user_players table with league_id
      const userPlayersData = newPlayers.map(player => ({
        user_id: team.user_id,
        bot_id: null,
        league_id: team.league_id,
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

    // Verify final results
    console.log('\n📋 Final verification:');
    const { count: totalUserPlayers, error: countError } = await supabase
      .from('user_players')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Failed to get final count:', countError);
    } else {
      console.log(`📊 Total players in user_players table: ${totalUserPlayers}`);
    }

    // Show sample of migrated players by league
    const { data: samplePlayers, error: sampleError } = await supabase
      .from('user_players')
      .select(`
        player_username,
        player_elo,
        purchase_price,
        leagues!inner(name)
      `)
      .order('purchased_at', { ascending: false })
      .limit(10);

    if (!sampleError && samplePlayers) {
      console.log('\n📋 Sample migrated players:');
      samplePlayers.forEach(player => {
        console.log(`  - ${player.player_username} (ELO: ${player.player_elo}) in ${player.leagues?.name} (Price: ${player.purchase_price})`);
      });
    }

  } catch (error) {
    console.error('Error migrating old league players:', error);
    process.exit(1);
  }
}

// Run the script
migrateOldLeaguePlayersV2(); 