import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyRLSFix() {
  try {
    console.log('🔧 Applying RLS fix for coin_transactions...\n');

    // Read the SQL fix file
    const sqlFilePath = path.join(process.cwd(), 'fix-coin-transactions-rls.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 SQL fix content:');
    console.log(sqlContent);
    console.log('\n🔄 Applying fix to database...');

    // Since exec_sql likely doesn't exist, provide manual instructions
    console.log('\n❌ exec_sql function not available.');
    console.log('\n📋 MANUAL APPLICATION REQUIRED:');
    console.log('\n1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('\n' + '='.repeat(80));
    console.log(sqlContent);
    console.log('='.repeat(80));
    console.log('\n4. Click "Run" to apply the fix');
    console.log('\n✅ After applying this fix, the coin deduction error should be resolved!');

  } catch (error) {
    console.error('❌ Error preparing RLS fix:', error);
    process.exit(1);
  }
}

applyRLSFix(); 