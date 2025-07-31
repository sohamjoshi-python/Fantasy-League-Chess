// Check lineups table issue causing 406 error
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

async function checkLineupsIssue() {
  console.log('🔍 Checking Lineups Table Issue...\n');
  
  try {
    // Test the exact query that's failing
    console.log('1️⃣ Testing the failing query...');
    const { data, error } = await supabase
      .from('lineups')
      .select('*')
      .eq('user_id', 'cfeded2c-8e7c-478f-bfd3-600a0574e524')
      .eq('league_id', 'e972e13b-01d7-49a8-913c-5c972a7c6b9c')
      .eq('week_start_date', '2025-07-28');
    
    if (error) {
      console.error('❌ Query error:', error);
    } else {
      console.log('✅ Query successful:', data);
    }
    
    console.log('');
    
    // Check if lineups table exists and has correct structure
    console.log('2️⃣ Checking lineups table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('lineups')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table access error:', tableError);
    } else {
      console.log('✅ Lineups table accessible');
      if (tableInfo && tableInfo.length > 0) {
        console.log('Sample row keys:', Object.keys(tableInfo[0]));
      }
    }
    
    console.log('');
    
    // Check RLS policies
    console.log('3️⃣ Checking RLS policies...');
    console.log('The 406 error might be due to RLS (Row Level Security) policies.');
    console.log('Make sure the user has permission to access lineups data.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLineupsIssue().then(() => {
  console.log('\n🏁 Check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
}); 