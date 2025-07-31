// Test Verification Process
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

async function testVerification() {
  console.log('🔍 Testing Verification Process...\n');

  // Test data - replace with your actual data
  const testLeagueCode = 'XV1FXH'; // Replace with your league code
  const testEmail = 'sohampjoshi@outlook.com'; // Replace with your email

  try {
    console.log(`Testing with league code: ${testLeagueCode}`);
    console.log(`Testing with email: ${testEmail}`);
    console.log('');

    // Step 1: Find the league by code
    console.log('1️⃣ Finding league by code...');
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, join_code, discord_server_id')
      .eq('join_code', testLeagueCode)
      .single();

    if (leagueError || !league) {
      console.error('❌ League not found:', leagueError);
      return;
    }

    console.log('✅ League found:', league);
    console.log('');

    // Step 2: Find the user by email
    console.log('2️⃣ Finding user by email...');
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

    // Step 3: Check if user is a member of this league
    console.log('3️⃣ Checking league membership...');
    const { data: member, error: memberError } = await supabase
      .from('league_members')
      .select('user_id, league_id')
      .eq('league_id', league.id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      console.error('❌ User is not a member of this league:', memberError);
      
      // Let's see what members exist for this league
      console.log('\n🔍 Checking all members of this league:');
      const { data: allMembers, error: allMembersError } = await supabase
        .from('league_members')
        .select('user_id, league_id')
        .eq('league_id', league.id);
      
      if (allMembersError) {
        console.error('Error fetching all members:', allMembersError);
      } else {
        console.log('All members of this league:', allMembers);
      }
      
      return;
    }

    console.log('✅ User is a member of this league:', member);
    console.log('');

    // Step 4: Check if league has Discord setup
    console.log('4️⃣ Checking Discord setup...');
    if (!league.discord_server_id) {
      console.error('❌ League does not have Discord setup');
      return;
    }

    console.log('✅ League has Discord setup:', league.discord_server_id);
    console.log('');

    console.log('🎉 All verification steps passed!');
    console.log('The user should be able to access the league channel.');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

testVerification().then(() => {
  console.log('\n🏁 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 