// Debug Edge Function to see detailed error
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

async function debugEdgeFunction() {
  console.log('🔍 Debugging Edge Function...\n');
  
  try {
    // Test with detailed logging
    const { data, error } = await supabase.functions.invoke('discord-bot-hybrid', {
      body: {
        action: 'verify_user_and_grant_access',
        userId: '880973796260073493',
        leagueCode: 'XV1FXH',
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

debugEdgeFunction().then(() => {
  console.log('\n🏁 Debug completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
}); 