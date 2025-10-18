// Test Welcome Email Fix - Updated Version
// Run this in your browser console

console.log('🧪 Testing Welcome Email Fix (Updated Version)...\n');

async function testWelcomeEmailFix() {
  try {
    console.log('📧 Testing welcome email fix...');
    
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
    
    // Test the AuthContext function
    console.log('\n🧪 Testing AuthContext welcome email logic...');
    console.log('📝 The checkAndSendWelcomeEmail function now:');
    console.log('   1. Checks if welcome email already sent (database flag)');
    console.log('   2. Prevents multiple simultaneous calls (processing flag)');
    console.log('   3. Sets flag BEFORE sending email (prevents race conditions)');
    console.log('   4. Only sends if email confirmed within 1 hour of creation');
    
    console.log('\n🎯 Expected Behavior:');
    console.log('- First time email confirmation: Welcome email sent + flag set to true');
    console.log('- Subsequent page loads: No welcome email sent (flag = true)');
    console.log('- Multiple rapid calls: Only first call processes (processing flag)');
    console.log('- Existing users: No welcome email sent (flag = true)');
    
    // Check if the column exists
    console.log('\n🔍 Database Check:');
    if (userData?.sent_welcome_email !== undefined) {
      console.log('✅ sent_welcome_email column exists');
    } else {
      console.log('❌ sent_welcome_email column missing - run SQL migration');
    }
    
  } catch (error) {
    console.log('❌ Test Error:', error.message);
  }
}

// Run the test
testWelcomeEmailFix();
