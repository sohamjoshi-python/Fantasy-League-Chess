// Test script to check HVC51R league and user membership
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SB_URL;
const supabaseServiceKey = process.env.SB_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables: SB_URL and SB_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLeagueHVC51R() {
  console.log('🔍 Testing HVC51R league and user membership...\n');
  
  const testEmail = 'sohampjoshi@outlook.com';
  const testDiscordId = '880973796260073493';
  const leagueCode = 'HVC51R';
  
  try {
    // 1. Check if league exists
    console.log('1️⃣ Checking if league HVC51R exists...');
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, join_code, discord_server_id, member_ids')
      .eq('join_code', leagueCode)
      .single();
    
    if (leagueError || !league) {
      console.error('❌ League HVC51R not found:', leagueError);
      return;
    }
    
    console.log('✅ League found:', league.name);
    console.log('   League ID:', league.id);
    console.log('   Discord Server ID:', league.discord_server_id);
    console.log('   Member IDs:', league.member_ids);
    console.log('');
    
    // 2. Check if user exists
    console.log('2️⃣ Checking if user exists...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, discord_user_id')
      .eq('email', testEmail)
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('   User ID:', user.id);
    console.log('   Discord User ID:', user.discord_user_id);
    console.log('');
    
    // 3. Check if user is member of league
    console.log('3️⃣ Checking if user is member of league...');
    const isMember = league.member_ids && Array.isArray(league.member_ids) && league.member_ids.includes(user.id);
    console.log('   Is member:', isMember);
    console.log('   League member_ids:', league.member_ids);
    console.log('   User ID:', user.id);
    console.log('');
    
    // 4. Check Discord server membership
    console.log('4️⃣ Checking Discord server membership...');
    const DISCORD_MAIN_SERVER_ID = process.env.DISCORD_MAIN_SERVER_ID;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    
    if (!DISCORD_MAIN_SERVER_ID || !DISCORD_BOT_TOKEN) {
      console.error('❌ Missing Discord environment variables');
      return;
    }
    
    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_MAIN_SERVER_ID}/members/${testDiscordId}`, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   Discord API Response:', memberResponse.status, memberResponse.statusText);
    console.log('   Is in Discord server:', memberResponse.ok);
    console.log('');
    
    // 5. Summary
    console.log('📊 SUMMARY:');
    console.log('   League exists:', !!league);
    console.log('   User exists:', !!user);
    console.log('   User is league member:', isMember);
    console.log('   User is in Discord server:', memberResponse.ok);
    console.log('   League has Discord channel:', !!league.discord_server_id);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testLeagueHVC51R().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 