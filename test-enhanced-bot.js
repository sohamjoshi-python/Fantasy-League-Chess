// Test Enhanced Discord Bot Setup
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SB_URL,
  process.env.SB_KEY
);

async function testEnhancedBot() {
  console.log('🧪 Testing Enhanced Discord Bot Setup...\n');

  try {
    // 1. Check environment variables
    console.log('1️⃣ Checking environment variables...');
    const requiredVars = [
      'DISCORD_BOT_TOKEN',
      'DISCORD_MAIN_SERVER_ID',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    let allVarsPresent = true;
    for (const varName of requiredVars) {
      const isPresent = !!process.env[varName];
      console.log(`${varName}: ${isPresent ? '✅ Set' : '❌ Missing'}`);
      if (!isPresent) allVarsPresent = false;
    }
    
    if (!allVarsPresent) {
      console.log('\n❌ Missing environment variables. Please check your .env file.');
      return;
    }
    
    console.log('\n2️⃣ Testing Discord API connection...');
    const discordResponse = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_MAIN_SERVER_ID}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (discordResponse.ok) {
      const guildData = await discordResponse.json();
      console.log('✅ Discord API connection successful');
      console.log('Server name:', guildData.name);
      console.log('Server ID:', guildData.id);
    } else {
      console.error('❌ Discord API connection failed:', discordResponse.status);
      return;
    }
    
    console.log('\n3️⃣ Testing Supabase connection...');
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('id, name, join_code, discord_channel_id')
      .limit(3);
    
    if (leaguesError) {
      console.error('❌ Supabase connection failed:', leaguesError);
      return;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('Found leagues:', leagues.length);
    leagues.forEach(league => {
      console.log(`  - ${league.name} (${league.join_code})`);
    });
    
    console.log('\n4️⃣ Testing hybrid Discord function...');
    const { data: functionData, error: functionError } = await supabase.functions.invoke('discord-bot-hybrid', {
      body: {
        action: 'verify_user_and_grant_access',
        userId: 'test-user-123',
        leagueCode: 'TEST123',
        email: 'test@example.com'
      }
    });
    
    if (functionError) {
      console.error('❌ Hybrid function test failed:', functionError);
    } else {
      console.log('✅ Hybrid function working correctly');
      console.log('Response:', functionData);
    }
    
    console.log('\n🎉 Enhanced Bot Setup Test Completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run the enhanced bot: node discord-bot-hybrid-dm.js');
    console.log('2. Test auto-DM by having someone join your Discord server');
    console.log('3. Test verification by having someone DM the bot with a league code');
    console.log('4. Check that new members get the welcome message automatically');
    
    console.log('\n🚀 Enhanced Features:');
    console.log('✅ Auto-DM new members with instructions');
    console.log('✅ Handle league verification DMs');
    console.log('✅ Hybrid system (direct channel access)');
    console.log('✅ Secure verification process');
    console.log('✅ No role management needed');
    console.log('✅ Welcome new members automatically');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedBot().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 