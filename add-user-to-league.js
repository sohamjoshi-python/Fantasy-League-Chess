// Add user to Dev League
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

async function addUserToLeague() {
  console.log('🔧 Adding user to Dev League...\n');
  
  try {
    // Get the league
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, member_ids')
      .eq('join_code', 'XV1FXH')
      .single();
    
    if (leagueError || !league) {
      console.error('❌ League not found');
      return;
    }
    
    console.log('✅ Found league:', league.name);
    console.log('Current member_ids:', league.member_ids);
    
    // Get the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'sohampjoshi@outlook.com')
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ Found user:', user.email);
    
    // Add user to member_ids array
    const currentMembers = league.member_ids || [];
    if (!currentMembers.includes(user.id)) {
      const updatedMembers = [...currentMembers, user.id];
      
      const { error: updateError } = await supabase
        .from('leagues')
        .update({ member_ids: updatedMembers })
        .eq('id', league.id);
      
      if (updateError) {
        console.error('❌ Error updating league:', updateError);
        return;
      }
      
      console.log('✅ Successfully added user to league!');
      console.log('Updated member_ids:', updatedMembers);
    } else {
      console.log('ℹ️ User is already in the league');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addUserToLeague().then(() => {
  console.log('\n🏁 Operation completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
}); 