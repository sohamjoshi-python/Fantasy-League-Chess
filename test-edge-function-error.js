// Test Edge Function to get actual error message
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

async function testEdgeFunctionError() {
  console.log('🧪 Testing Edge Function Error...\n');
  
  try {
    // Test with the exact payload the bot sends
    const { data, error } = await supabase.functions.invoke('discord-bot-hybrid', {
      body: {
        action: 'verify_user_and_grant_access',
        userId: '880973796260073493',
        leagueCode: 'XV1FXH',
        email: 'sohampjoshi@outlook.com'
      }
    });
    
    if (error) {
      console.error('❌ Edge Function error:', error);
      
      // Try to get the response body
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/discord-bot-hybrid`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'verify_user',
            userId: '880973796260073493',
            leagueCode: 'XV1FXH',
            email: 'sohampjoshi@outlook.com'
          })
        });
        
        const errorText = await response.text();
        console.error('❌ Actual error response:', errorText);
      } catch (fetchError) {
        console.error('❌ Could not fetch error details:', fetchError);
      }
    } else {
      console.log('✅ Edge Function response:', data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEdgeFunctionError().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 