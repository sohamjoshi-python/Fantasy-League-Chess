// Test the success case to see what's causing the error
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

async function testSuccessCase() {
  console.log('🧪 Testing Success Case...\n');
  
  try {
    // Test with the league the user is actually a member of
    const { data, error } = await supabase.functions.invoke('discord-bot-hybrid', {
      body: {
        action: 'verify_user_and_grant_access',
        userId: '880973796260073493',
        leagueCode: '8WTDXX', // The league the user is actually in
        email: 'sohampjoshi@outlook.com'
      }
    });
    
    console.log('Full response:', JSON.stringify(data, null, 2));
    
    if (data?.data?.success === false) {
      console.log('❌ Verification failed with message:', data.data.message);
    } else if (data?.data?.success === true) {
      console.log('✅ Verification successful:', data.data.message);
    } else {
      console.log('❓ Unexpected response format:', data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSuccessCase().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 