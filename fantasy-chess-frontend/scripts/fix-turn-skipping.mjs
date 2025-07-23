import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTurnSkipping() {
  try {
    console.log('🔧 Fixing turn skipping issue...\n');

    // Get the league that has the issue
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, marketplace_started, current_marketplace_turn, marketplace_order, member_ids')
      .eq('marketplace_started', true);

    if (leaguesError) throw new Error(leaguesError.message);

    if (!leagues || leagues.length === 0) {
      console.log('No leagues with marketplace started found.');
      return;
    }

    const league = leagues[0];
    console.log(`🏆 Fixing league: ${league.name} (${league.id})`);
    console.log(`   Current turn: ${league.current_marketplace_turn}`);
    console.log(`   Order length: ${league.marketplace_order?.length || 0}`);

    // Get all marketplace turns to understand the current state
    const { data: allTurns, error: turnsError } = await supabase
      .from('marketplace_turns')
      .select('*')
      .eq('league_id', league.id)
      .order('created_at', { ascending: true });

    if (turnsError) {
      console.error('Error fetching turns:', turnsError);
      return;
    }

    if (allTurns && allTurns.length > 0) {
      console.log('\n📋 Current marketplace turns:');
      allTurns.forEach((turn, index) => {
        const timestamp = new Date(turn.created_at).toLocaleTimeString();
        console.log(`   ${index + 1}. Turn ${turn.turn_number}: ${turn.action_type} by ${turn.user_id} at ${timestamp}`);
      });

      // Find the last valid turn (no gaps)
      const turnNumbers = allTurns.map(t => t.turn_number).sort((a, b) => a - b);
      console.log(`\n🔍 Turn numbers: ${turnNumbers.join(', ')}`);

      // Find the last consecutive turn
      let lastValidTurn = -1;
      for (let i = 0; i < turnNumbers.length; i++) {
        if (turnNumbers[i] === i) {
          lastValidTurn = i;
        } else {
          break;
        }
      }

      console.log(`\n✅ Last valid turn: ${lastValidTurn}`);
      console.log(`   This means turns 0-${lastValidTurn} are valid`);
      console.log(`   We should reset to turn ${lastValidTurn + 1}`);

      // Reset the league to the correct turn
      console.log('\n🔄 Resetting league to correct turn...');
      const { error: resetError } = await supabase
        .from('leagues')
        .update({
          current_marketplace_turn: lastValidTurn + 1,
          marketplace_completed: false
        })
        .eq('id', league.id);

      if (resetError) {
        console.error('❌ Error resetting league:', resetError);
        return;
      }

      console.log(`✅ Successfully reset league to turn ${lastValidTurn + 1}`);

      // Verify the fix
      console.log('\n📊 Verifying fix...');
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
      console.log('   No marketplace turns found - no fix needed');
    }

    console.log('\n✅ Turn skipping fix completed!');
    console.log('\n💡 The marketplace should now work correctly without skipping turns.');

  } catch (error) {
    console.error('❌ Error fixing turn skipping:', error);
    process.exit(1);
  }
}

fixTurnSkipping(); 