// Test each step of the verification process
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

async function testVerificationSteps() {
  console.log('🔍 Testing Verification Steps...\n');
  
  try {
    // Step 1: Check if league exists
    console.log('1️⃣ Checking league...');
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, join_code, discord_server_id, member_ids')
      .eq('join_code', 'XV1FXH')
      .single();
    
    if (leagueError) {
      console.error('❌ League error:', leagueError);
      return;
    }
    console.log('✅ League found:', league.name);
    console.log('   Discord server ID:', league.discord_server_id);
    console.log('   Member IDs:', league.member_ids);
    
    // Step 2: Check if user exists
    console.log('\n2️⃣ Checking user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, discord_user_id')
      .eq('email', 'sohampjoshi@outlook.com')
      .single();
    
    if (userError) {
      console.error('❌ User error:', userError);
      return;
    }
    console.log('✅ User found:', user.email);
    console.log('   User ID:', user.id);
    console.log('   Discord ID:', user.discord_user_id);
    
    // Step 3: Check if user is in league
    console.log('\n3️⃣ Checking league membership...');
    const isMember = league.member_ids && Array.isArray(league.member_ids) && league.member_ids.includes(user.id);
    console.log('   Is member:', isMember ? '✅ YES' : '❌ NO');
    
    // Step 4: Test Discord API call
    console.log('\n4️⃣ Testing Discord API...');
    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_MAIN_SERVER_ID}/members/880973796260073493`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ User is in Discord server');
      } else {
        console.log('❌ User not in Discord server:', response.status);
      }
    } catch (discordError) {
      console.error('❌ Discord API error:', discordError);
    }
    
    // Step 5: Test channel permissions
    if (league.discord_server_id) {
      console.log('\n5️⃣ Testing channel permissions...');
      try {
        const permResponse = await fetch(`https://discord.com/api/v10/channels/${league.discord_server_id}/permissions/880973796260073493`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 1,
            allow: "1024",
            deny: "0"
          })
        });
        
        if (permResponse.ok) {
          console.log('✅ Channel permissions granted');
        } else {
          console.log('❌ Channel permission error:', permResponse.status);
          const errorText = await permResponse.text();
          console.log('   Error details:', errorText);
        }
      } catch (permError) {
        console.error('❌ Permission API error:', permError);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testVerificationSteps().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 