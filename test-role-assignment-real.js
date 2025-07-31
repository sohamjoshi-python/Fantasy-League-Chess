// Test role assignment with real Discord user ID
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

async function testRoleAssignmentReal() {
  console.log('🔍 Testing Role Assignment with Real User...\n');

  try {
    // Get your Discord user ID
    console.log('1️⃣ Getting your Discord user ID...');
    console.log('Please provide your Discord user ID (right-click your name → Copy ID)');
    console.log('Or use this command in Discord: /userinfo');
    console.log('');
    
    // Replace this with your actual Discord user ID
    const testUserId = 'YOUR_DISCORD_USER_ID_HERE'; // Replace this!
    
    if (testUserId === 'YOUR_DISCORD_USER_ID_HERE') {
      console.log('❌ Please replace YOUR_DISCORD_USER_ID_HERE with your actual Discord user ID');
      console.log('To get your Discord user ID:');
      console.log('1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)');
      console.log('2. Right-click your username → Copy ID');
      console.log('3. Replace the testUserId variable in this script');
      return;
    }

    // Check if user is in the server
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

    // Get leagues with role IDs
    console.log('\n3️⃣ Getting leagues with role IDs...');
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, discord_role_id')
      .not('discord_role_id', 'is', null);

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
      return;
    }

    console.log('✅ Leagues with role IDs:');
    leagues.forEach(league => {
      console.log(`- ${league.name}: ${league.discord_role_id}`);
    });

    if (leagues.length === 0) {
      console.log('❌ No leagues with role IDs found');
      return;
    }

    // Test role assignment with the first league
    const testLeague = leagues[0];
    console.log(`\n4️⃣ Testing role assignment for ${testLeague.name}...`);
    
    const { data: assignData, error: assignError } = await supabase.functions.invoke('discord-bot', {
      body: {
        action: 'assign_user_to_role',
        userId: testUserId,
        roleId: testLeague.discord_role_id
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
        roleId: testLeague.discord_role_id
      }
    });

    if (removeError) {
      console.error('❌ Role removal error:', removeError);
    } else {
      console.log('✅ Role removal response:', removeData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRoleAssignmentReal().then(() => {
  console.log('\n🏁 Real user role assignment test completed!');
  console.log('\n📋 Instructions:');
  console.log('1. Replace YOUR_DISCORD_USER_ID_HERE with your actual Discord user ID');
  console.log('2. Make sure you are in the Discord server');
  console.log('3. Run the script again');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 