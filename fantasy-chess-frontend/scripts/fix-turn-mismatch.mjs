import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTurnMismatch() {
  try {
    console.log('🔧 Fixing turn mismatch issue...\n');

    // Get all leagues with marketplace started
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, marketplace_started, current_marketplace_turn, marketplace_order, member_ids')
      .eq('marketplace_started', true);

    if (leaguesError) throw new Error(leaguesError.message);

    if (!leagues || leagues.length === 0) {
      console.log('No leagues with marketplace started found.');
      return;
    }

    for (const league of leagues) {
      console.log(`\n🏆 Checking league: ${league.name} (${league.id})`);
      console.log(`   Current turn in league table: ${league.current_marketplace_turn}`);

      // Get all marketplace turns for this league
      const { data: allTurns, error: turnsError } = await supabase
        .from('marketplace_turns')
        .select('*')
        .eq('league_id', league.id)
        .order('created_at', { ascending: true });

      if (turnsError) {
        console.error('Error fetching turns:', turnsError);
        continue;
      }

      if (allTurns && allTurns.length > 0) {
        console.log(`   Marketplace turns recorded: ${allTurns.length}`);
        
        // Show the turns
        allTurns.forEach((turn, index) => {
          const timestamp = new Date(turn.created_at).toLocaleTimeString();
          console.log(`     ${index + 1}. Turn ${turn.turn_number}: ${turn.action_type} by ${turn.user_id} at ${timestamp}`);
        });

        // Find the highest turn number recorded
        const turnNumbers = allTurns.map(t => t.turn_number);
        const maxTurnRecorded = Math.max(...turnNumbers);
        const expectedNextTurn = maxTurnRecorded + 1;

        console.log(`   Highest turn recorded: ${maxTurnRecorded}`);
        console.log(`   Expected next turn: ${expectedNextTurn}`);
        console.log(`   Current league turn: ${league.current_marketplace_turn}`);

        // Check if there's a mismatch
        if (league.current_marketplace_turn !== expectedNextTurn) {
          console.log(`   ❌ MISMATCH DETECTED!`);
          console.log(`   🔄 Fixing league turn from ${league.current_marketplace_turn} to ${expectedNextTurn}...`);

          // Fix the league turn
          const { error: resetError } = await supabase
            .from('leagues')
            .update({
              current_marketplace_turn: expectedNextTurn,
              marketplace_completed: false
            })
            .eq('id', league.id);

          if (resetError) {
            console.error('❌ Error fixing league:', resetError);
          } else {
            console.log(`   ✅ Successfully fixed league turn to ${expectedNextTurn}`);
          }
        } else {
          console.log(`   ✅ Turn numbers match correctly`);
        }

        // Verify the fix
        console.log(`\n📊 Verifying fix...`);
        const { data: currentTurn, error: turnError } = await supabase.rpc('get_current_marketplace_turn', {
          p_league_id: league.id
        });

        if (turnError) {
          console.error('Error getting current turn:', turnError);
        } else if (currentTurn && currentTurn.length > 0) {
          const turn = currentTurn[0];
          console.log(`   Current user ID: ${turn.current_user_id}`);
          console.log(`   Turn number: ${turn.turn_number}`);
          console.log(`   Total turns: ${turn.total_turns}`);
          console.log(`   Is completed: ${turn.is_completed}`);
          
          // Show expected next user
          const nextTurnIndex = turn.turn_number + 1;
          const nextUserId = league.marketplace_order?.[nextTurnIndex + 1];
          console.log(`   Expected next user: ${nextUserId || 'None'}`);
        }

      } else {
        console.log(`   No marketplace turns found - league should be at turn 0`);
        if (league.current_marketplace_turn !== 0) {
          console.log(`   🔄 Fixing league turn from ${league.current_marketplace_turn} to 0...`);
          
          const { error: resetError } = await supabase
            .from('leagues')
            .update({
              current_marketplace_turn: 0,
              marketplace_completed: false
            })
            .eq('id', league.id);

          if (resetError) {
            console.error('❌ Error fixing league:', resetError);
          } else {
            console.log(`   ✅ Successfully reset league to turn 0`);
          }
        }
      }
    }

    console.log('\n✅ Turn mismatch fix completed!');
    console.log('\n💡 All leagues should now have correct turn numbers.');

  } catch (error) {
    console.error('❌ Error fixing turn mismatch:', error);
    process.exit(1);
  }
}

fixTurnMismatch(); 