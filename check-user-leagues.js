// Check User's League Memberships
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

async function checkUserLeagues() {
  console.log('🔍 Checking User League Memberships...\n');

  const testEmail = 'sohampjoshi@outlook.com';

  try {
    // Find the user
    console.log('1️⃣ Finding user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', testEmail)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return;
    }

    console.log('✅ User found:', user);
    console.log('');

    // Check all league memberships for this user
    console.log('2️⃣ Checking all league memberships...');
    const { data: memberships, error: membershipsError } = await supabase
      .from('leagues')
      .select('id, name, join_code, member_ids')
      .contains('member_ids', [user.id]);

    if (membershipsError) {
      console.error('❌ Error fetching memberships:', membershipsError);
      return;
    }

    console.log('✅ User league memberships:', memberships);
    console.log('');

    // Check specific leagues mentioned in the logs
    console.log('3️⃣ Checking specific leagues...');
    const leaguesToCheck = ['XV1FXH', 'F81BUK'];
    
    for (const joinCode of leaguesToCheck) {
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('id, name, join_code, member_ids')
        .eq('join_code', joinCode)
        .single();
      
      if (leagueError) {
        console.log(`❌ League ${joinCode} not found`);
        continue;
      }
      
      const isMember = league.member_ids && Array.isArray(league.member_ids) && league.member_ids.includes(user.id);
      console.log(`League ${joinCode} (${league.name}): ${isMember ? '✅ Member' : '❌ Not member'}`);
      console.log(`  Member IDs: ${league.member_ids}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserLeagues().then(() => {
  console.log('\n🏁 Check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
}); 