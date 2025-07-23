import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugBuyError() {
  try {
    console.log('🔍 Debugging buy player error...\n');

    // Get a test league and user
    const { data: leagues, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, marketplace_started, current_marketplace_turn, marketplace_order, member_ids')
      .eq('marketplace_started', true)
      .limit(1);

    if (leagueError) {
      console.error('❌ Error fetching leagues:', leagueError);
      return;
    }

    if (!leagues || leagues.length === 0) {
      console.log('❌ No leagues with marketplace started found');
      return;
    }

    const league = leagues[0];
    console.log('📋 League found:', {
      id: league.id,
      name: league.name,
      marketplace_started: league.marketplace_started,
      current_turn: league.current_marketplace_turn,
      member_count: league.member_ids?.length || 0
    });

    if (!league.member_ids || league.member_ids.length === 0) {
      console.log('❌ No members in league');
      return;
    }

    const userId = league.member_ids[0];
    console.log('👤 Using user ID:', userId);

    // Check user's coin balance
    const { data: coinBalance, error: coinError } = await supabase
      .from('league_coin_balances')
      .select('coin_balance')
      .eq('user_id', userId)
      .eq('league_id', league.id)
      .single();

    if (coinError) {
      console.error('❌ Error fetching coin balance:', coinError);
      return;
    }

    console.log('💰 User coin balance:', coinBalance?.coin_balance || 'Not found');

    // Get a test player
    const { data: players, error: playerError } = await supabase
      .from('chess_players')
      .select('id, name, elo')
      .limit(1);

    if (playerError) {
      console.error('❌ Error fetching players:', playerError);
      return;
    }

    if (!players || players.length === 0) {
      console.log('❌ No players found');
      return;
    }

    const player = players[0];
    const price = Math.max(10, Math.floor(player.elo / 100));
    console.log('🎯 Test player:', {
      id: player.id,
      name: player.name,
      elo: player.elo,
      price: price
    });

    // Check if user has enough coins
    if (coinBalance && coinBalance.coin_balance < price) {
      console.log('❌ Insufficient coins. Required:', price, 'Available:', coinBalance.coin_balance);
      return;
    }

    console.log('\n🔄 Testing record_marketplace_action function...');

    // Test the record_marketplace_action function
    const { data: actionData, error: actionError } = await supabase.rpc('record_marketplace_action', {
      p_league_id: league.id,
      p_user_id: userId,
      p_action_type: 'buy',
      p_player_id: player.id,
      p_price: price,
      p_bot_id: null
    });

    if (actionError) {
      console.error('❌ record_marketplace_action error:', actionError);
      console.error('Error details:', {
        message: actionError.message,
        details: actionError.details,
        hint: actionError.hint,
        code: actionError.code
      });
    } else {
      console.log('✅ record_marketplace_action succeeded:', actionData);
    }

    // Check updated coin balance
    const { data: newCoinBalance, error: newCoinError } = await supabase
      .from('league_coin_balances')
      .select('coin_balance')
      .eq('user_id', userId)
      .eq('league_id', league.id)
      .single();

    if (!newCoinError && newCoinBalance) {
      console.log('💰 Updated coin balance:', newCoinBalance.coin_balance);
    }

    // Check marketplace turns
    const { data: turns, error: turnsError } = await supabase
      .from('marketplace_turns')
      .select('*')
      .eq('league_id', league.id)
      .order('turn_number', { ascending: false })
      .limit(5);

    if (!turnsError && turns) {
      console.log('📊 Recent marketplace turns:', turns.length);
      turns.forEach(turn => {
        console.log(`  Turn ${turn.turn_number}: ${turn.action_type} by ${turn.user_id}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugBuyError(); 