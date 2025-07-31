// Test script to debug Discord role functionality
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

async function testDiscordRoles() {
  console.log('🔍 Testing Discord Role System...\n');

  try {
    // Test 1: Check if roles are being created and stored
    console.log('1️⃣ Checking leagues for role data...');
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id, discord_invite_link, discord_role_id')
      .order('created_at', { ascending: false })
      .limit(5);

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
    } else {
      console.log('✅ Recent leagues with Discord data:');
      leagues.forEach(league => {
        console.log(`- ${league.name}:`);
        console.log(`  Channel ID: ${league.discord_server_id}`);
        console.log(`  Role ID: ${league.discord_role_id || '❌ Missing'}`);
        console.log(`  Invite: ${league.discord_invite_link}`);
        console.log('');
      });
    }

    // Test 2: Test role assignment function
    console.log('2️⃣ Testing role assignment...');
    const testRoleData = {
      action: 'assign_user_to_role',
      userId: '123456789', // Test user ID
      roleId: '1399926292899434656' // Role ID from recent test
    };

    console.log('Sending role assignment test:', testRoleData);

    const { data: roleData, error: roleError } = await supabase.functions.invoke('discord-bot', {
      body: testRoleData
    });

    if (roleError) {
      console.error('❌ Role assignment error:', roleError);
    } else {
      console.log('✅ Role assignment response:', roleData);
    }
    console.log('');

    // Test 3: Test role removal function
    console.log('3️⃣ Testing role removal...');
    const testRemoveData = {
      action: 'remove_user_from_role',
      userId: '123456789', // Test user ID
      roleId: '1399926292899434656' // Role ID from recent test
    };

    console.log('Sending role removal test:', testRemoveData);

    const { data: removeData, error: removeError } = await supabase.functions.invoke('discord-bot', {
      body: testRemoveData
    });

    if (removeError) {
      console.error('❌ Role removal error:', removeError);
    } else {
      console.log('✅ Role removal response:', removeData);
    }
    console.log('');

    // Test 4: Check Discord API for role info
    console.log('4️⃣ Checking Discord API for role info...');
    const discordResponse = await fetch('https://discord.com/api/v10/guilds/' + process.env.DISCORD_MAIN_SERVER_ID + '/roles', {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (discordResponse.ok) {
      const roles = await discordResponse.json();
      console.log('✅ Discord server roles:');
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
testDiscordRoles().then(() => {
  console.log('\n🏁 Role test completed!');
  console.log('\n📋 Role System Issues to Check:');
  console.log('1. Are roles being created in Discord?');
  console.log('2. Are role IDs being stored in the database?');
  console.log('3. Do users get assigned to roles when they join?');
  console.log('4. Can users see the private channels?');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 