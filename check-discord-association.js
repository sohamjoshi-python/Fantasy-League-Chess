// Check Discord ID association
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

async function checkDiscordAssociation() {
  console.log('🔍 Checking Discord ID Association...\n');
  
  try {
    // Check current user state
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, discord_user_id')
      .eq('email', 'sohampjoshi@outlook.com')
      .single();
    
    if (userError) {
      console.error('❌ User error:', userError);
      return;
    }
    
    console.log('✅ User found:');
    console.log('   Email:', user.email);
    console.log('   User ID:', user.id);
    console.log('   Discord ID:', user.discord_user_id);
    console.log('');
    
    if (user.discord_user_id) {
      console.log('✅ Discord ID is associated!');
      console.log('The bot should remember you now.');
    } else {
      console.log('❌ Discord ID is NOT associated!');
      console.log('This is why you have to provide your email every time.');
      console.log('');
      console.log('💡 Let\'s manually associate it:');
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ discord_user_id: '880973796260073493' })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('❌ Error updating Discord ID:', updateError);
      } else {
        console.log('✅ Successfully associated Discord ID!');
        console.log('Now the bot should remember you.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDiscordAssociation().then(() => {
  console.log('\n🏁 Check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
}); 