// Simple test for Discord verification system
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

async function testDiscordVerificationSimple() {
  console.log('🔍 Testing Discord Verification System (Simple)...\n');

  try {
    // Test 1: Use existing discord-bot function to create a channel
    console.log('1️⃣ Creating a test league with existing discord-bot function...');
    const testLeagueId = 'test-league-' + Date.now();
    const testData = {
      action: 'create_league_channel',
      leagueName: 'Verification Test League',
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
      
      // Check if role ID was returned and stored
      if (data && data.data && data.data.roleId) {
        console.log('✅ Role ID returned:', data.data.roleId);
        
        // Test 2: Check if role ID was stored in database
        console.log('\n2️⃣ Checking if role ID was stored in database...');
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
      } else {
        console.log('❌ No role ID in response');
      }
    }
    console.log('');

    // Test 3: Test verification logic (simulate the verification process)
    console.log('3️⃣ Testing verification logic...');
    console.log('This would verify:');
    console.log('- League code exists in database');
    console.log('- User email is a member of the league');
    console.log('- User is in Discord server');
    console.log('- Assign role to user');
    console.log('');

    // Test 4: Check database schema for verification
    console.log('4️⃣ Checking database schema for verification...');
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, join_code, discord_role_id')
      .limit(3);

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
    } else {
      console.log('✅ Sample leagues with join codes:');
      leagues.forEach(league => {
        console.log(`- ${league.name}:`);
        console.log(`  Join Code: ${league.join_code || '❌ Missing'}`);
        console.log(`  Role ID: ${league.discord_role_id || '❌ Missing'}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDiscordVerificationSimple().then(() => {
  console.log('\n🏁 Simple verification test completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy the discord-bot-verification function');
  console.log('2. Set up the Discord bot for handling DMs');
  console.log('3. Test the full verification flow');
  console.log('4. Update frontend to show new Discord flow');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 