// Test script for hybrid Discord system
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

async function testHybridDiscord() {
  console.log('🔍 Testing Hybrid Discord System...\n');

  try {
    // Test 1: Create a league channel with hybrid approach
    console.log('1️⃣ Creating a test league with hybrid approach...');
    const testLeagueId = 'test-league-' + Date.now();
    const testData = {
      action: 'create_league_channel',
      leagueName: 'Hybrid Test League',
      leagueId: testLeagueId
    };

    console.log('Sending test data:', testData);

    const { data, error } = await supabase.functions.invoke('discord-bot-hybrid', {
      body: testData
    });

    if (error) {
      console.error('❌ Discord bot function error:', error);
    } else {
      console.log('✅ Discord bot function response:', data);
      
      if (data && data.data && data.data.channelId) {
        console.log('✅ Channel created:', data.data.channelId);
        console.log('✅ Invite URL:', data.data.inviteUrl);
      }
    }
    console.log('');

    // Test 2: Test user verification and direct access
    console.log('2️⃣ Testing user verification and direct access...');
    const verificationData = {
      action: 'verify_user_and_grant_access',
      userId: '123456789', // Test user ID
      leagueCode: 'TEST123', // Test league code
      email: 'test@example.com' // Test email
    };

    console.log('Sending verification test:', verificationData);

    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('discord-bot-hybrid', {
      body: verificationData
    });

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
    } else {
      console.log('✅ Verification response:', verifyData);
    }
    console.log('');

    // Test 3: Test removing user access
    console.log('3️⃣ Testing user access removal...');
    const removeData = {
      action: 'remove_user_access',
      userId: '123456789', // Test user ID
      leagueCode: 'TEST123' // Test league code
    };

    console.log('Sending removal test:', removeData);

    const { data: removeResponse, error: removeError } = await supabase.functions.invoke('discord-bot-hybrid', {
      body: removeData
    });

    if (removeError) {
      console.error('❌ Removal error:', removeError);
    } else {
      console.log('✅ Removal response:', removeResponse);
    }

    // Test 4: Check existing leagues
    console.log('\n4️⃣ Checking existing leagues...');
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, join_code, discord_server_id')
      .not('discord_server_id', 'is', null)
      .limit(3);

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
    } else {
      console.log('✅ Leagues with Discord channels:');
      leagues.forEach(league => {
        console.log(`- ${league.name}:`);
        console.log(`  Join Code: ${league.join_code}`);
        console.log(`  Channel ID: ${league.discord_server_id}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testHybridDiscord().then(() => {
  console.log('\n🏁 Hybrid Discord test completed!');
  console.log('\n📋 Hybrid System Benefits:');
  console.log('✅ No roles needed - Direct channel access');
  console.log('✅ Still secure - Verifies league membership');
  console.log('✅ Simpler management - Add/remove users directly');
  console.log('✅ Better UX - Users get immediate access');
  console.log('✅ Easier setup - No role management complexity');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 