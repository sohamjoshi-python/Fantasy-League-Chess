import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTurnSkipping() {
  try {
    console.log('🔍 Debugging turn skipping issue...\n');

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
    console.log(`🏆 Debugging league: ${league.name} (${league.id})`);
    console.log(`   Current turn: ${league.current_marketplace_turn}`);
    console.log(`   Order length: ${league.marketplace_order?.length || 0}`);
    console.log(`   Members: ${league.member_ids?.join(', ') || 'None'}`);

    // Get ALL marketplace turns for this league
    console.log('\n📋 All marketplace turns (ordered by created_at):');
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
      allTurns.forEach((turn, index) => {
        const timestamp = new Date(turn.created_at).toLocaleTimeString();
        console.log(`   ${index + 1}. Turn ${turn.turn_number}: ${turn.action_type} by ${turn.user_id} at ${timestamp}`);
      });

      // Analyze turn gaps
      console.log('\n🔍 Analyzing turn gaps:');
      const turnNumbers = allTurns.map(t => t.turn_number).sort((a, b) => a - b);
      console.log(`   Turn numbers in order: ${turnNumbers.join(', ')}`);
      
      const gaps = [];
      for (let i = 0; i < turnNumbers.length - 1; i++) {
        const current = turnNumbers[i];
        const next = turnNumbers[i + 1];
        if (next - current > 1) {
          gaps.push({ from: current, to: next, gap: next - current - 1 });
        }
      }
      
      if (gaps.length > 0) {
        console.log('   ❌ Found gaps in turn sequence:');
        gaps.forEach(gap => {
          console.log(`      Gap: Turn ${gap.from} → Turn ${gap.to} (skipped ${gap.gap} turns)`);
        });
      } else {
        console.log('   ✅ No gaps found in turn sequence');
      }

      // Check for duplicate turn numbers
      const duplicates = turnNumbers.filter((item, index) => turnNumbers.indexOf(item) !== index);
      if (duplicates.length > 0) {
        console.log(`   ⚠️  Found duplicate turn numbers: ${duplicates.join(', ')}`);
      }

    } else {
      console.log('   No marketplace turns found');
    }

    // Get current turn info
    console.log('\n📊 Current turn info:');
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
      console.log(`   User team size: ${turn.user_team_size}`);
      
      // Show expected next user
      const nextTurnIndex = turn.turn_number + 1;
      const nextUserId = league.marketplace_order?.[nextTurnIndex + 1];
      console.log(`   Expected next user: ${nextUserId || 'None'}`);
    }

    // Check if there are any recent turns that might indicate the issue
    console.log('\n🔍 Recent activity (last 10 turns):');
    const { data: recentTurns, error: recentError } = await supabase
      .from('marketplace_turns')
      .select('*')
      .eq('league_id', league.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent turns:', recentError);
    } else if (recentTurns) {
      recentTurns.reverse().forEach((turn, index) => {
        const timestamp = new Date(turn.created_at).toLocaleTimeString();
        console.log(`   ${index + 1}. Turn ${turn.turn_number}: ${turn.action_type} by ${turn.user_id} at ${timestamp}`);
      });
    }

    console.log('\n✅ Turn skipping debug completed!');

  } catch (error) {
    console.error('❌ Error debugging turn skipping:', error);
    process.exit(1);
  }
}

debugTurnSkipping(); 