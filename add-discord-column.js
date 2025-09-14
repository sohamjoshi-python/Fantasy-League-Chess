// Add    user ID column to users table
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

async function addDiscordColumn() {
  console.log('🔧 Adding Discord user ID column to users table...');
  
  try {
    // Add the column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_user_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_users_discord_user_id ON users(discord_user_id);
      `
    });
    
    if (alterError) {
      console.error('❌ Error adding column:', alterError);
      return;
    }
    
    console.log('✅ Successfully added discord_user_id column to users table');
    console.log('✅ Created index for faster lookups');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addDiscordColumn().then(() => {
  console.log('🏁 Column addition completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
}); 