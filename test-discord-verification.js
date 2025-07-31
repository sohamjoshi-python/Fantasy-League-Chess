// Test script for Discord verification system
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

async function testDiscordVerification() {
  console.log('🔍 Testing Discord Verification System...\n');

  try {
    // Test 1: Create a league with Discord integration
    console.log('1️⃣ Creating a test league with Discord...');
    const testLeagueId = 'test-league-' + Date.now();
    const testData = {
      action: 'create_league_channel',
      leagueName: 'Verification Test League',
      leagueId: testLeagueId
    };

    console.log('Sending test data:', testData);

    const { data, error } = await supabase.functions.invoke('discord-bot-verification', {
      body: testData
    });

    if (error) {
      console.error('❌ Discord bot function error:', error);
    } else {
      console.log('✅ Discord bot function response:', data);
    }
    console.log('');

    // Test 2: Test user verification (simulate DM verification)
    console.log('2️⃣ Testing user verification...');
    const verificationData = {
      action: 'verify_user_and_assign_role',
      userId: '123456789', // Test user ID
      leagueCode: 'TEST123', // Test league code
      email: 'test@example.com' // Test email
    };

    console.log('Sending verification test:', verificationData);

    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('discord-bot-verification', {
      body: verificationData
    });

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
    } else {
      console.log('✅ Verification response:', verifyData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDiscordVerification().then(() => {
  console.log('\n🏁 Verification test completed!');
  console.log('\n📋 New Discord Integration Flow:');
  console.log('1. User clicks "Join Discord Server" → Goes to Discord server');
  console.log('2. User DMs bot with league code');
  console.log('3. Bot asks for email address');
  console.log('4. Bot verifies email against Supabase league membership');
  console.log('5. Bot assigns role and gives access to private channel');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 