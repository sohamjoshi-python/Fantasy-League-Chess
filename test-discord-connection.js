// Test Discord bot connection and Edge Function
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

async function testDiscordConnection() {
  console.log('🧪 Testing Discord Bot Connection...\n');
  
  try {
    // Test 1: Check if we can call the Edge Function
    console.log('1️⃣ Testing Edge Function call...');
    const { data, error } = await supabase.functions.invoke('discord-bot-hybrid', {
      body: {
        action: 'verify_user',
        userId: '880973796260073493', // Your Discord ID
        leagueCode: 'XV1FXH',
        email: 'sohampjoshi@outlook.com'
      }
    });
    
    if (error) {
      console.error('❌ Edge Function error:', error);
    } else {
      console.log('✅ Edge Function response:', data);
    }
    
    console.log('');
    
    // Test 2: Check user in database
    console.log('2️⃣ Checking user in database...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, discord_user_id')
      .eq('email', 'sohampjoshi@outlook.com')
      .single();
    
    if (userError) {
      console.error('❌ User lookup error:', userError);
    } else {
      console.log('✅ User found:', user);
    }
    
    console.log('');
    
    // Test 3: Check league in database
    console.log('3️⃣ Checking league in database...');
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, join_code, member_ids')
      .eq('join_code', 'XV1FXH')
      .single();
    
    if (leagueError) {
      console.error('❌ League lookup error:', leagueError);
    } else {
      console.log('✅ League found:', league);
    }
    
    console.log('');
    
    // Test 4: Check if user is in league member_ids
    if (user && league) {
      console.log('4️⃣ Checking league membership...');
      const isMember = league.member_ids && Array.isArray(league.member_ids) && league.member_ids.includes(user.id);
      console.log(`User ID: ${user.id}`);
      console.log(`League member_ids: ${league.member_ids}`);
      console.log(`Is member: ${isMember ? '✅ YES' : '❌ NO'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDiscordConnection().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 