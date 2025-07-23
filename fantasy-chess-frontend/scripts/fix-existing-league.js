import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixExistingLeague() {
  try {
    console.log('🔧 Fixing existing league marketplace order...\n');

    // Get the league that needs fixing
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, marketplace_started, current_marketplace_turn, marketplace_order, member_ids')
      .eq('marketplace_started', true);

    if (leaguesError) throw new Error(leaguesError.message);

    if (!leagues || leagues.length === 0) {
      console.log('No leagues with marketplace started found.');
      return;
    }

    const league = leagues[0]; // Get the first league
    console.log(`🏆 Fixing league: ${league.name} (${league.id})`);
    console.log(`   Members: ${league.member_ids?.join(', ') || 'None'}`);
    console.log(`   Current turn: ${league.current_marketplace_turn}`);
    console.log(`   Current order: ${league.marketplace_order?.join(', ') || 'None'}`);

    if (!league.member_ids || league.member_ids.length === 0) {
      console.log('❌ No members found in league');
      return;
    }

    // Generate correct snake draft order
    const memberIds = league.member_ids;
    const memberCount = memberIds.length;
    const correctOrder = [];

    console.log(`\n🔧 Generating correct snake draft order for ${memberCount} members...`);

    // For each round (0-9), add all players in snake order
    for (let round = 0; round < 10; round++) {
      if (round % 2 === 0) {
        // Even rounds: forward order (1, 2, 3, ...)
        for (let i = 0; i < memberCount; i++) {
          correctOrder.push(memberIds[i]);
        }
      } else {
        // Odd rounds: reverse order (3, 2, 1, ...)
        for (let i = memberCount - 1; i >= 0; i--) {
          correctOrder.push(memberIds[i]);
        }
      }
    }

    console.log(`✅ Generated correct order with ${correctOrder.length} turns`);
    console.log(`   First 10 turns: ${correctOrder.slice(0, 10).join(', ')}`);

    // Update the league with the correct order
    console.log('\n🔄 Updating league with correct order...');
    const { error: updateError } = await supabase
      .from('leagues')
      .update({
        marketplace_order: correctOrder,
        current_marketplace_turn: 0, // Reset to beginning
        marketplace_completed: false
      })
      .eq('id', league.id);

    if (updateError) {
      console.error('❌ Failed to update league:', updateError);
      return;
    }

    console.log('✅ Successfully updated league with correct marketplace order!');

    // Verify the update
    console.log('\n📊 Verifying update...');
    const { data: updatedLeague, error: verifyError } = await supabase
      .from('leagues')
      .select('id, name, marketplace_started, current_marketplace_turn, marketplace_order')
      .eq('id', league.id)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify update:', verifyError);
      return;
    }

    console.log(`🏆 Updated league: ${updatedLeague.name}`);
    console.log(`   Turn: ${updatedLeague.current_marketplace_turn}`);
    console.log(`   Order length: ${updatedLeague.marketplace_order?.length || 0}`);
    console.log(`   First 10 turns: ${updatedLeague.marketplace_order?.slice(0, 10).join(', ') || 'None'}`);

    console.log('\n✅ Fix completed! The marketplace should now work correctly.');

  } catch (error) {
    console.error('❌ Error fixing existing league:', error);
    process.exit(1);
  }
}

fixExistingLeague(); 