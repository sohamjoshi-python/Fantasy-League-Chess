// Check if league has Discord channel setup
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

async function checkLeagueDiscord() {
  console.log('🔍 Checking League Discord Setup...\n');
  
  try {
    // Check the league the user is in
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, join_code, discord_server_id, member_ids')
      .eq('join_code', '8WTDXX')
      .single();
    
    if (leagueError) {
      console.error('❌ League error:', leagueError);
      return;
    }
    
    console.log('✅ League found:', league.name);
    console.log('   Join Code:', league.join_code);
    console.log('   Discord Server ID:', league.discord_server_id);
    console.log('   Member IDs:', league.member_ids);
    
    if (!league.discord_server_id) {
      console.log('\n❌ League does not have a Discord channel set up!');
      console.log('This is why the verification is failing.');
      console.log('');
      console.log('💡 To fix this:');
      console.log('1. Go to the Fantasy League Chess website');
      console.log('2. Create a Discord channel for this league');
      console.log('3. Or join a league that already has Discord setup');
    } else {
      console.log('\n✅ League has Discord channel setup');
      console.log('The issue might be elsewhere in the Edge Function');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLeagueDiscord().then(() => {
  console.log('\n🏁 Check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
}); 