// Test to fix role storage issue
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

async function testRoleStorage() {
  console.log('🔧 Testing Role Storage Fix...\n');

  try {
    // Test 1: Check existing leagues and manually update them with role IDs
    console.log('1️⃣ Checking existing leagues...');
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, join_code, discord_server_id, discord_role_id')
      .not('discord_server_id', 'is', null);

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
    } else {
      console.log('✅ Leagues with Discord channels:');
      leagues.forEach(league => {
        console.log(`- ${league.name}:`);
        console.log(`  Channel ID: ${league.discord_server_id}`);
        console.log(`  Role ID: ${league.discord_role_id || '❌ Missing'}`);
        console.log(`  Join Code: ${league.join_code}`);
      });
    }
    console.log('');

    // Test 2: Check if discord_role_id column exists
    console.log('2️⃣ Checking database schema...');
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_league_discord_info', { p_league_id: leagues[0].id });

    if (schemaError) {
      console.error('❌ Schema check error:', schemaError);
    } else {
      console.log('✅ Schema check result:', schemaData);
    }
    console.log('');

    // Test 3: Manually update a league with role ID
    console.log('3️⃣ Testing manual role ID update...');
    const testRoleId = 'test-role-' + Date.now();
    const { data: updateData, error: updateError } = await supabase
      .from('leagues')
      .update({ 
        discord_role_id: testRoleId 
      })
      .eq('id', leagues[0].id)
      .select();

    if (updateError) {
      console.error('❌ Manual update error:', updateError);
    } else {
      console.log('✅ Manual update successful:', updateData);
    }
    console.log('');

    // Test 4: Check Discord API for roles
    console.log('4️⃣ Checking Discord API for roles...');
    const discordResponse = await fetch('https://discord.com/api/v10/guilds/' + process.env.DISCORD_MAIN_SERVER_ID + '/roles', {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (discordResponse.ok) {
      const roles = await discordResponse.json();
      console.log('✅ Discord roles:');
      roles.forEach(role => {
        if (role.name.startsWith('League-')) {
          console.log(`- ${role.name} (ID: ${role.id})`);
        }
      });
    } else {
      console.error('❌ Discord API error:', discordResponse.status, discordResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRoleStorage().then(() => {
  console.log('\n🏁 Role storage test completed!');
  console.log('\n📋 Analysis:');
  console.log('1. Check if discord_role_id column exists');
  console.log('2. Check if manual updates work');
  console.log('3. Check if Discord roles exist');
  console.log('4. Fix the function to store role IDs properly');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 