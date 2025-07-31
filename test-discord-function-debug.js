// Test script to debug Discord function and role storage
import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SB_URL;
const supabaseServiceKey = process.env.SB_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDiscordFunctionDebug() {
  console.log('🔍 Testing Discord Function Debug...\n');

  try {
    // Test 1: Create a new league channel and see if role ID is stored
    console.log('1️⃣ Creating a new league channel...');
    const testLeagueId = 'test-league-' + Date.now();
    const testData = {
      action: 'create_league_channel',
      leagueName: 'Debug Test League',
      leagueId: testLeagueId
    };

    console.log('Sending test data:', testData);

    const { data, error } = await supabase.functions.invoke('discord-bot', {
      body: testData
    });

    if (error) {
      console.error('❌ Discord bot function error:', error);
    } else {
      console.log('✅ Discord bot function response:', data);
      
      // Check if the role ID was returned
      if (data && data.data && data.data.roleId) {
        console.log('✅ Role ID returned:', data.data.roleId);
      } else {
        console.log('❌ No role ID in response');
      }
    }
    console.log('');

    // Test 2: Check if the role ID was stored in database
    console.log('2️⃣ Checking database for role ID...');
    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id, discord_invite_link, discord_role_id')
      .eq('id', testLeagueId)
      .single();

    if (leagueError) {
      console.error('❌ Error fetching league:', leagueError);
    } else {
      console.log('✅ League data from database:', leagueData);
      if (leagueData.discord_role_id) {
        console.log('✅ Role ID stored in database:', leagueData.discord_role_id);
      } else {
        console.log('❌ Role ID NOT stored in database');
      }
    }
    console.log('');

    // Test 3: Check if the discord_role_id column exists
    console.log('3️⃣ Checking database schema...');
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_league_discord_info', { p_league_id: testLeagueId });

    if (schemaError) {
      console.error('❌ Schema check error:', schemaError);
    } else {
      console.log('✅ Schema check result:', schemaData);
    }

    // Test 4: Manually update a league with role ID
    console.log('\n4️⃣ Testing manual role ID update...');
    const { data: updateData, error: updateError } = await supabase
      .from('leagues')
      .update({ 
        discord_role_id: 'test-role-id-' + Date.now() 
      })
      .eq('id', testLeagueId)
      .select();

    if (updateError) {
      console.error('❌ Manual update error:', updateError);
    } else {
      console.log('✅ Manual update successful:', updateData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDiscordFunctionDebug().then(() => {
  console.log('\n🏁 Function debug test completed!');
  console.log('\n📋 Analysis:');
  console.log('1. Check if role ID is returned by the function');
  console.log('2. Check if role ID is stored in database');
  console.log('3. Check if discord_role_id column exists');
  console.log('4. Check if manual updates work');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 