// Set Discord environment variables in Supabase Edge Function secrets
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

async function setSupabaseSecrets() {
  console.log('🔧 Setting Discord secrets in Supabase...\n');
  
  // Get Discord environment variables from local .env
  const discordBotToken = process.env.DISCORD_BOT_TOKEN;
  const discordMainServerId = process.env.DISCORD_MAIN_SERVER_ID;
  const discordClientId = process.env.DISCORD_CLIENT_ID;
  
  if (!discordBotToken || !discordMainServerId || !discordClientId) {
    console.error('❌ Missing Discord environment variables in local .env file');
    console.log('Please make sure your .env file contains:');
    console.log('- DISCORD_BOT_TOKEN');
    console.log('- DISCORD_MAIN_SERVER_ID');
    console.log('- DISCORD_CLIENT_ID');
    return;
  }
  
  console.log('✅ Found Discord environment variables:');
  console.log('   Bot Token:', discordBotToken.substring(0, 10) + '...');
  console.log('   Server ID:', discordMainServerId);
  console.log('   Client ID:', discordClientId);
  console.log('');
  
  console.log('📝 To set these in Supabase:');
  console.log('');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Go to Settings → Edge Functions');
  console.log('3. Add these secrets:');
  console.log('');
  console.log(`   DISCORD_BOT_TOKEN = ${discordBotToken}`);
  console.log(`   DISCORD_MAIN_SERVER_ID = ${discordMainServerId}`);
  console.log(`   DISCORD_CLIENT_ID = ${discordClientId}`);
  console.log('');
  console.log('4. Click "Save"');
  console.log('');
  console.log('After setting these secrets, redeploy the Edge Function.');
  
  // Note: We can't programmatically set secrets via the API for security reasons
  // The user needs to manually set them in the Supabase dashboard
}

setSupabaseSecrets().then(() => {
  console.log('\n🏁 Instructions completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
}); 