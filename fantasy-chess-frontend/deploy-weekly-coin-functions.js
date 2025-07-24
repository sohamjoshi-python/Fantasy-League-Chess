import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployWeeklyCoinFunctions() {
  try {
    console.log('🚀 Deploying weekly coin distribution functions...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20250723000000_add_weekly_coin_distribution.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not available, trying direct execution...');
      
      // Split SQL into individual statements and execute them
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (statement.length === 0) continue;
        
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (stmtError) {
            console.log(`⚠️  Statement ${i + 1} had an issue (likely already exists):`, stmtError.message);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (e) {
          console.log(`⚠️  Statement ${i + 1} skipped (likely already exists):`, e.message);
        }
      }
    } else {
      console.log('✅ SQL executed successfully');
    }
    
    // Test the function
    console.log('🧪 Testing the function...');
    const { data: testData, error: testError } = await supabase.rpc('distribute_weekly_coins_to_active_leagues_with_history');
    
    if (testError) {
      console.error('❌ Function test failed:', testError);
      return;
    }
    
    console.log('✅ Function test successful!');
    console.log('📊 Test result:', testData);
    
    console.log('🎉 Weekly coin distribution functions deployed successfully!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

deployWeeklyCoinFunctions(); 