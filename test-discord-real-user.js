// Test script with real Discord user ID
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

async function testRealUserRoleAssignment() {
  console.log('🔍 Testing Discord Role Assignment with Real User...\n');

  try {
    // Test 1: Get your Discord user ID
    console.log('1️⃣ Getting your Discord user ID...');
    console.log('Please provide your Discord user ID (right-click your name → Copy ID)');
    console.log('Or use this command in Discord: /userinfo');
    console.log('');

    // For now, let's test with a placeholder - replace with your actual Discord user ID
    const testUserId = 'YOUR_DISCORD_USER_ID_HERE'; // Replace this with your actual Discord user ID
    
    if (testUserId === 'YOUR_DISCORD_USER_ID_HERE') {
      console.log('❌ Please replace YOUR_DISCORD_USER_ID_HERE with your actual Discord user ID');
      console.log('To get your Discord user ID:');
      console.log('1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)');
      console.log('2. Right-click your username → Copy ID');
      console.log('3. Replace the testUserId variable in this script');
      return;
    }

    // Test 2: Check if user is in the server
    console.log('2️⃣ Checking if user is in the server...');
    const discordResponse = await fetch('https://discord.com/api/v10/guilds/' + process.env.DISCORD_MAIN_SERVER_ID + '/members/' + testUserId, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (discordResponse.ok) {
      const memberData = await discordResponse.json();
      console.log('✅ User is in the server:', memberData.user.username);
    } else {
      console.error('❌ User is not in the server or bot token is invalid');
      console.error('Status:', discordResponse.status, discordResponse.statusText);
      return;
    }

    // Test 3: Get available roles
    console.log('\n3️⃣ Getting available roles...');
    const rolesResponse = await fetch('https://discord.com/api/v10/guilds/' + process.env.DISCORD_MAIN_SERVER_ID + '/roles', {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (rolesResponse.ok) {
      const roles = await rolesResponse.json();
      const leagueRoles = roles.filter(role => role.name.startsWith('League-'));
      console.log('✅ Available league roles:');
      leagueRoles.forEach(role => {
        console.log(`- ${role.name} (ID: ${role.id})`);
      });

      if (leagueRoles.length > 0) {
        const testRoleId = leagueRoles[0].id;
        console.log(`\n4️⃣ Testing role assignment with role: ${leagueRoles[0].name} (${testRoleId})`);

        // Test role assignment
        const { data: assignData, error: assignError } = await supabase.functions.invoke('discord-bot', {
          body: {
            action: 'assign_user_to_role',
            userId: testUserId,
            roleId: testRoleId
          }
        });

        if (assignError) {
          console.error('❌ Role assignment error:', assignError);
        } else {
          console.log('✅ Role assignment response:', assignData);
        }

        // Test role removal
        console.log('\n5️⃣ Testing role removal...');
        const { data: removeData, error: removeError } = await supabase.functions.invoke('discord-bot', {
          body: {
            action: 'remove_user_from_role',
            userId: testUserId,
            roleId: testRoleId
          }
        });

        if (removeError) {
          console.error('❌ Role removal error:', removeError);
        } else {
          console.log('✅ Role removal response:', removeData);
        }
      } else {
        console.log('❌ No league roles found');
      }
    } else {
      console.error('❌ Error fetching roles:', rolesResponse.status, rolesResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRealUserRoleAssignment().then(() => {
  console.log('\n🏁 Real user test completed!');
  console.log('\n📋 Instructions:');
  console.log('1. Replace YOUR_DISCORD_USER_ID_HERE with your actual Discord user ID');
  console.log('2. Make sure you are in the Discord server');
  console.log('3. Run the script again');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 