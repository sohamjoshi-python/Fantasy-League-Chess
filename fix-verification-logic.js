// Fix Verification Logic - check league_members table structure
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

async function checkLeagueMembersStructure() {
  console.log('🔍 Checking league_members table structure...\n');

  try {
    // Check the structure of league_members table
    const { data: members, error } = await supabase
      .from('league_members')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching league_members:', error);
      return;
    }

    console.log('✅ League members found:', members.length);
    console.log('Sample league member data:');
    console.log(JSON.stringify(members[0], null, 2));
    console.log('');

    // Check if there are any members with email addresses
    const { data: allMembers, error: allError } = await supabase
      .from('league_members')
      .select('*');

    if (allError) {
      console.error('❌ Error fetching all members:', allError);
      return;
    }

    console.log('Total league members:', allMembers.length);
    
    // Check what fields are available
    if (allMembers.length > 0) {
      const sampleMember = allMembers[0];
      console.log('Available fields in league_members:');
      Object.keys(sampleMember).forEach(key => {
        console.log(`  - ${key}: ${sampleMember[key]}`);
      });
    }

    // Test with a specific email
    const testEmail = 'your.email@example.com'; // Replace with your actual email
    console.log(`\n🔍 Testing verification for email: ${testEmail}`);
    
    // Try different ways to find the user
    console.log('\n1. Looking for email in user_id field:');
    const { data: userById, error: userByIdError } = await supabase
      .from('league_members')
      .select('*')
      .eq('user_id', testEmail);
    
    console.log('Results:', userById?.length || 0, 'matches');
    if (userByIdError) console.error('Error:', userByIdError);

    console.log('\n2. Looking for email in email field (if exists):');
    const { data: userByEmail, error: userByEmailError } = await supabase
      .from('league_members')
      .select('*')
      .eq('email', testEmail);
    
    console.log('Results:', userByEmail?.length || 0, 'matches');
    if (userByEmailError) console.error('Error:', userByEmailError);

    console.log('\n3. Looking for any field containing the email:');
    const { data: allMembersData, error: allMembersError } = await supabase
      .from('league_members')
      .select('*');
    
    if (!allMembersError && allMembersData) {
      const matches = allMembersData.filter(member => 
        JSON.stringify(member).toLowerCase().includes(testEmail.toLowerCase())
      );
      console.log('Results:', matches.length, 'matches');
      if (matches.length > 0) {
        console.log('Found in:', matches[0]);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLeagueMembersStructure().then(() => {
  console.log('\n🏁 Check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
}); 