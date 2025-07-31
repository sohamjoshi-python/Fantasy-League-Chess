// Test Edge Function with minimal payload
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

async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function...\n');
  
  try {
    // Test with minimal payload
    const { data, error } = await supabase.functions.invoke('discord-bot-hybrid', {
      body: {
        action: 'test'
      }
    });
    
    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('Error details:', error.message);
    } else {
      console.log('✅ Edge Function response:', data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEdgeFunction().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 