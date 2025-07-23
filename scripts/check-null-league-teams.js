import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndFixNullLeagueTeams() {
  try {
    console.log('🔍 Checking for teams with null league_ids...\n');

    // Get all teams with null league_id
    const { data: nullLeagueTeams, error: nullLeagueError } = await supabase
      .from('teams')
      .select(`
        id,
        user_id,
        league_id,
        player_ids,
        created_at
      `)
      .is('league_id', null);

    if (nullLeagueError) {
      throw new Error(`Failed to fetch teams with null league_id: ${nullLeagueError.message}`);
    }

    console.log(`📊 Found ${nullLeagueTeams.length} teams with null league_id`);

    if (nullLeagueTeams.length === 0) {
      console.log('✅ No teams with null league_id found!');
      return;
    }

    // Display the problematic teams
    console.log('\n📋 Teams with null league_id:');
    nullLeagueTeams.forEach((team, index) => {
      console.log(`  ${index + 1}. Team ID: ${team.id}`);
      console.log(`     User ID: ${team.user_id}`);
      console.log(`     Player count: ${team.player_ids?.length || 0}`);
      console.log(`     Created: ${team.created_at}`);
      console.log('');
    });

    // Check if these teams have any valid league associations
    console.log('🔍 Checking for potential league associations...\n');

    for (const team of nullLeagueTeams) {
      // Check if user is in any leagues
      if (team.user_id) {
        const { data: userLeagues, error: userLeaguesError } = await supabase
          .from('leagues')
          .select('id, name')
          .contains('member_ids', [team.user_id]);

        if (!userLeaguesError && userLeagues && userLeagues.length > 0) {
          console.log(`👤 User ${team.user_id} is in ${userLeagues.length} league(s):`);
          userLeagues.forEach(league => {
            console.log(`   - ${league.name} (${league.id})`);
          });
        } else {
          console.log(`👤 User ${team.user_id} is not in any leagues`);
        }
      }

      // Check if there are any lineups for this team that might indicate the league
      const { data: lineups, error: lineupsError } = await supabase
        .from('lineups')
        .select('league_id, leagues(name)')
        .eq('user_id', team.user_id);

      if (!lineupsError && lineups && lineups.length > 0) {
        console.log(`📅 Found ${lineups.length} lineup(s) for user ${team.user_id}:`);
        const uniqueLeagues = [...new Set(lineups.map(l => l.league_id))];
        uniqueLeagues.forEach(leagueId => {
          const league = lineups.find(l => l.league_id === leagueId);
          console.log(`   - ${league.leagues?.name} (${leagueId})`);
        });
      }
    }

    console.log('\n💡 Recommendation:');
    console.log('   These teams with null league_id should either be:');
    console.log('   1. Deleted if they are orphaned');
    console.log('   2. Updated with the correct league_id if the league can be determined');
    console.log('   3. Migrated to the new user_players system if they contain valid players');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndFixNullLeagueTeams(); 