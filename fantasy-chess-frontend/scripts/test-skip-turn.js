import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSkipTurn() {
  try {
    console.log('🧪 Testing skip turn functionality...\n');

    // Get the league that needs testing
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
    console.log(`🏆 Testing league: ${league.name} (${league.id})`);
    console.log(`   Current turn: ${league.current_marketplace_turn}`);
    console.log(`   Order length: ${league.marketplace_order?.length || 0}`);
    console.log(`   Members: ${league.member_ids?.join(', ') || 'None'}`);

    // Get current turn info
    const { data: currentTurn, error: turnError } = await supabase.rpc('get_current_marketplace_turn', {
      p_league_id: league.id
    });

    if (turnError) throw new Error(turnError.message);

    if (currentTurn && currentTurn.length > 0) {
      const turn = currentTurn[0];
      console.log(`\n📊 Current turn info:`);
      console.log(`   Current user ID: ${turn.current_user_id}`);
      console.log(`   Turn number: ${turn.turn_number}`);
      console.log(`   Total turns: ${turn.total_turns}`);
      console.log(`   Is completed: ${turn.is_completed}`);
      console.log(`   User team size: ${turn.user_team_size}`);
      
      // Show expected next user
      const nextTurnIndex = turn.turn_number + 1;
      const nextUserId = league.marketplace_order?.[nextTurnIndex + 1];
      console.log(`   Expected next user: ${nextUserId || 'None'}`);
    }

    // Show recent marketplace turns
    console.log(`\n📋 Recent marketplace turns:`);
    const { data: recentTurns, error: turnsError } = await supabase
      .from('marketplace_turns')
      .select('*')
      .eq('league_id', league.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (turnsError) {
      console.error('Error fetching recent turns:', turnsError);
    } else if (recentTurns) {
      recentTurns.reverse().forEach((turn, index) => {
        console.log(`   ${index + 1}. Turn ${turn.turn_number}: ${turn.action_type} by ${turn.user_id}`);
      });
    }

    console.log('\n✅ Skip turn test completed!');

  } catch (error) {
    console.error('❌ Error testing skip turn:', error);
    process.exit(1);
  }
}

testSkipTurn(); 