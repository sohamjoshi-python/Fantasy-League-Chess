import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSnakeDraft() {
  try {
    console.log('🔧 Fixing snake draft order...\n');

    // First, let's see what leagues have marketplace issues
    console.log('📊 Checking current leagues...');
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, marketplace_started, current_marketplace_turn, marketplace_order, member_ids')
      .eq('marketplace_started', true);

    if (leaguesError) throw new Error(leaguesError.message);

    console.log(`Found ${leagues?.length || 0} leagues with marketplace started\n`);

    if (leagues && leagues.length > 0) {
      for (const league of leagues) {
        console.log(`🏆 League: ${league.name} (${league.id})`);
        console.log(`   Current turn: ${league.current_marketplace_turn}`);
        console.log(`   Order length: ${league.marketplace_order?.length || 0}`);
        console.log(`   Members: ${league.member_ids?.length || 0}`);
        console.log(`   First 5 turns: ${league.marketplace_order?.slice(0, 5).join(', ') || 'None'}`);
        console.log('');
      }
    }

    // Apply the fix to the start_marketplace function
    console.log('🔧 Updating start_marketplace function...');
    const fixFunctionSQL = `
      CREATE OR REPLACE FUNCTION start_marketplace(p_league_id UUID)
      RETURNS void AS $$
      DECLARE
          league_record RECORD;
          member_count INTEGER;
          total_turns INTEGER;
          marketplace_order UUID[];
          round_num INTEGER;
          player_index INTEGER;
      BEGIN
          -- Get league information
          SELECT * INTO league_record FROM leagues WHERE id = p_league_id;
          
          IF NOT FOUND THEN
              RAISE EXCEPTION 'League not found';
          END IF;
          
          -- Calculate total turns needed (10 players per member)
          member_count := array_length(league_record.member_ids, 1);
          total_turns := member_count * 10;
          
          -- Generate marketplace order (snake draft style)
          marketplace_order := '{}';
          
          -- For each round (0-9), add all players in snake order
          FOR round_num IN 0..9 LOOP
              IF round_num % 2 = 0 THEN
                  -- Even rounds: forward order (1, 2, 3, ...)
                  FOR player_index IN 1..member_count LOOP
                      marketplace_order := marketplace_order || league_record.member_ids[player_index];
                  END LOOP;
              ELSE
                  -- Odd rounds: reverse order (3, 2, 1, ...)
                  FOR player_index IN member_count..1 BY -1 LOOP
                      marketplace_order := marketplace_order || league_record.member_ids[player_index];
                  END LOOP;
              END IF;
          END LOOP;
          
          -- Update league with marketplace settings
          UPDATE leagues 
          SET 
              marketplace_started = true,
              marketplace_start_time = NOW(),
              marketplace_order = marketplace_order,
              current_marketplace_turn = 0,
              marketplace_completed = false
          WHERE id = p_league_id;
          
          -- Debug: Log the generated order
          RAISE NOTICE 'Generated marketplace order for league %: %', p_league_id, marketplace_order;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: fixFunctionSQL });
    if (functionError) {
      console.error('❌ Failed to update function:', functionError);
      // Try direct SQL execution
      console.log('🔄 Trying direct SQL execution...');
      const { error: directError } = await supabase.rpc('exec_sql', { 
        sql: 'DROP FUNCTION IF EXISTS start_marketplace(UUID);' 
      });
      if (directError) {
        console.error('❌ Failed to drop function:', directError);
        return;
      }
    }

    console.log('✅ Function updated successfully\n');

    // Reset marketplace for existing leagues
    if (leagues && leagues.length > 0) {
      console.log('🔄 Resetting marketplace for existing leagues...');
      
      for (const league of leagues) {
        console.log(`   Resetting ${league.name}...`);
        
        try {
          const { error: resetError } = await supabase.rpc('start_marketplace', {
            p_league_id: league.id
          });
          
          if (resetError) {
            console.error(`   ❌ Failed to reset ${league.name}:`, resetError);
          } else {
            console.log(`   ✅ Successfully reset ${league.name}`);
          }
        } catch (err) {
          console.error(`   ❌ Error resetting ${league.name}:`, err);
        }
      }
    }

    // Verify the fix worked
    console.log('\n📊 Verifying fix...');
    const { data: updatedLeagues, error: verifyError } = await supabase
      .from('leagues')
      .select('id, name, marketplace_started, current_marketplace_turn, marketplace_order')
      .eq('marketplace_started', true);

    if (verifyError) throw new Error(verifyError.message);

    if (updatedLeagues && updatedLeagues.length > 0) {
      for (const league of updatedLeagues) {
        console.log(`🏆 ${league.name}:`);
        console.log(`   Turn: ${league.current_marketplace_turn}`);
        console.log(`   Order length: ${league.marketplace_order?.length || 0}`);
        console.log(`   First 10 turns: ${league.marketplace_order?.slice(0, 10).join(', ') || 'None'}`);
        console.log('');
      }
    }

    console.log('✅ Snake draft fix completed!');

  } catch (error) {
    console.error('❌ Error fixing snake draft:', error);
    process.exit(1);
  }
}

fixSnakeDraft(); 