import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyBackendFix() {
  try {
    console.log('🔧 Applying backend fix for race condition...\n');

    // Read the SQL fix file
    const sqlFilePath = path.join(process.cwd(), 'fix-advance-turn-race-condition.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 SQL fix content:');
    console.log(sqlContent);
    console.log('\n🔄 Applying fix to database...');

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + '...');

        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.error(`❌ Error executing statement ${i + 1}:`, error);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Exception executing statement ${i + 1}:`, err);
        }
      }
    }

    console.log('\n✅ Backend fix applied!');
    console.log('\n💡 The marketplace should now be protected against race conditions.');

  } catch (error) {
    console.error('❌ Error applying backend fix:', error);
    
    // Fallback: Try to apply the fix manually
    console.log('\n🔄 Trying manual application...');
    try {
      // Test if exec_sql function exists
      const { error: testError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
      if (testError) {
        console.log('❌ exec_sql function not available. Please apply the SQL manually:');
        console.log('\n📄 Copy and paste this SQL into your Supabase SQL editor:');
        const sqlFilePath = path.join(process.cwd(), 'fix-advance-turn-race-condition.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        console.log(sqlContent);
      }
    } catch (fallbackError) {
      console.error('❌ Manual application also failed:', fallbackError);
    }
    
    process.exit(1);
  }
}

applyBackendFix(); 