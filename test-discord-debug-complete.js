// Test script to debug Discord integration
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

async function testDiscordIntegration() {
  console.log('🔍 Testing Discord Integration...\n');

  try {
    // Test 1: Check environment variables
    console.log('1️⃣ Checking environment variables...');
    console.log('SB_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SB_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    console.log('DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('DISCORD_MAIN_SERVER_ID:', process.env.DISCORD_MAIN_SERVER_ID ? '✅ Set' : '❌ Missing');
    console.log('');

    // Test 2: Test Discord bot function
    console.log('2️⃣ Testing Discord bot function...');
    const testData = {
      action: 'create_league_channel',
      leagueName: 'Test League Debug',
      leagueId: 'test-league-' + Date.now()
    };

    console.log('Sending test data:', testData);

    const { data, error } = await supabase.functions.invoke('discord-bot', {
      body: testData
    });

    if (error) {
      console.error('❌ Discord bot function error:', error);
    } else {
      console.log('✅ Discord bot function response:', data);
    }
    console.log('');

    // Test 3: Check if any leagues have Discord data
    console.log('3️⃣ Checking existing leagues for Discord data...');
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id, discord_invite_link, discord_role_id')
      .limit(5);

    if (leaguesError) {
      console.error('❌ Error fetching leagues:', leaguesError);
    } else {
      console.log('✅ Leagues with Discord data:', leagues);
    }
    console.log('');

    // Test 4: Test Discord API directly (only if we have the token)
    if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_MAIN_SERVER_ID) {
      console.log('4️⃣ Testing Discord API directly...');
      const discordResponse = await fetch('https://discord.com/api/v10/guilds/' + process.env.DISCORD_MAIN_SERVER_ID, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (discordResponse.ok) {
        const guildData = await discordResponse.json();
        console.log('✅ Discord server info:', {
          name: guildData.name,
          id: guildData.id,
          member_count: guildData.approximate_member_count
        });
      } else {
        console.error('❌ Discord API error:', discordResponse.status, discordResponse.statusText);
        const errorText = await discordResponse.text();
        console.error('Error details:', errorText);
      }
    } else {
      console.log('4️⃣ Skipping Discord API test (missing environment variables)');
    }

    // Test 5: Check Supabase environment variables
    console.log('\n5️⃣ Checking Supabase Edge Function environment variables...');
    console.log('Note: You need to check these in Supabase Dashboard → Settings → Edge Functions');
    console.log('Required variables:');
    console.log('- DISCORD_BOT_TOKEN');
    console.log('- DISCORD_MAIN_SERVER_ID');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDiscordIntegration().then(() => {
  console.log('\n🏁 Test completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Check Supabase Dashboard → Settings → Edge Functions for environment variables');
  console.log('2. Verify DISCORD_BOT_TOKEN and DISCORD_MAIN_SERVER_ID are set');
  console.log('3. Make sure the bot is in your Discord server with proper permissions');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 