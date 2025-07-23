import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupBadTeams() {
  try {
    console.log('🔍 Finding teams with null league_id or player_ids containing null...');

    // 1. Find teams with null league_id
    const { data: nullLeagueTeams, error: nullLeagueError } = await supabase
      .from('teams')
      .select('id, user_id, league_id, player_ids, created_at')
      .is('league_id', null);

    if (nullLeagueError) throw new Error(nullLeagueError.message);

    // 2. Find teams with player_ids containing null
    const { data: allTeams, error: allTeamsError } = await supabase
      .from('teams')
      .select('id, user_id, league_id, player_ids, created_at');

    if (allTeamsError) throw new Error(allTeamsError.message);

    const teamsWithNullPlayer = (allTeams || []).filter(
      t => Array.isArray(t.player_ids) && t.player_ids.some(pid => pid === null)
    );

    // Combine all bad team IDs
    const badTeamIds = [
      ...(nullLeagueTeams || []).map(t => t.id),
      ...teamsWithNullPlayer.map(t => t.id)
    ];
    const uniqueBadTeamIds = [...new Set(badTeamIds)];

    if (uniqueBadTeamIds.length === 0) {
      console.log('✅ No bad teams found!');
      return;
    }

    // Print what will be deleted
    console.log(`🗑️  Deleting ${uniqueBadTeamIds.length} bad team(s):`);
    for (const id of uniqueBadTeamIds) {
      const team = [...(nullLeagueTeams || []), ...teamsWithNullPlayer].find(t => t.id === id);
      console.log(`  - Team ID: ${id}, User: ${team?.user_id}, League: ${team?.league_id}, Created: ${team?.created_at}`);
    }

    // Delete the bad teams
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .in('id', uniqueBadTeamIds);

    if (deleteError) throw new Error(deleteError.message);

    console.log('✅ Bad teams deleted successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cleanupBadTeams();