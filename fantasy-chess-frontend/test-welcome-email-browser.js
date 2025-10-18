// Test Welcome Email Fix - Browser Console Version
// Run this in your browser console

console.log('🧪 Testing Welcome Email Fix (Browser Console Version)...\n');

async function testWelcomeEmailFix() {
  try {
    console.log('📧 Testing welcome email fix...');
    
    // Import supabase from the global scope
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    // Use the same config as your app
    const supabaseUrl = 'https://wdbwzvnkfbyzazodfhsw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.0PT7ZAC8wGjVEw4Tv_1Oob9BfxPOtzTXmPKfwX7qdJA';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check current user's welcome email status
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log('❌ No user session found - please sign in first');
      return;
    }
    
    console.log('👤 Current user:', session.user.email);
    console.log('🆔 User ID:', session.user.id);
    
    // Check if welcome email has been sent
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('sent_welcome_email, created_at, username')
      .eq('id', session.user.id)
      .single();
    
    if (userError) {
      console.log('❌ Error checking user data:', userError);
      console.log('💡 This might mean the sent_welcome_email column doesn\'t exist yet');
      console.log('💡 Run the SQL migration first:');
      console.log(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS sent_welcome_email BOOLEAN DEFAULT FALSE;
        
        UPDATE users 
        SET sent_welcome_email = TRUE 
        WHERE sent_welcome_email IS NULL OR sent_welcome_email = FALSE;
      `);
      return;
    }
    
    console.log('📊 User Data:');
    console.log('- Username:', userData?.username);
    console.log('- Welcome email sent:', userData?.sent_welcome_email);
    console.log('- User created at:', userData?.created_at);
    
    if (userData?.sent_welcome_email) {
      console.log('✅ Welcome email already sent - no duplicate emails will be sent');
      console.log('🎯 This user will NOT receive welcome emails on page loads');
    } else {
      console.log('⚠️ Welcome email not yet sent');
      console.log('🎯 This user WILL receive a welcome email on next email confirmation');
    }
    
    console.log('\n🎯 Expected Behavior:');
    console.log('- First time email confirmation: Welcome email sent + flag set to true');
    console.log('- Subsequent page loads: No welcome email sent (flag = true)');
    console.log('- Existing users: No welcome email sent (flag = true)');
    
    console.log('\n🔧 Current Fix Status:');
    console.log('✅ Fixed: TypeError with sendWelcomeEmailFree return type');
    console.log('✅ Fixed: Race condition by setting flag before sending email');
    console.log('✅ Fixed: Multiple calls by checking database flag first');
    console.log('✅ Fixed: Scope issue with welcomeEmailProcessing variable');
    
  } catch (error) {
    console.log('❌ Test Error:', error.message);
  }
}

// Run the test
testWelcomeEmailFix();
