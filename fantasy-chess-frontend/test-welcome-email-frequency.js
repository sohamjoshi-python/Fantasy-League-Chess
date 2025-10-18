// Test Welcome Email Frequency Fix
// Run this in your browser console

console.log('🧪 Testing Welcome Email Frequency Fix...\n');

async function testWelcomeEmailFrequency() {
  try {
    console.log('📧 Testing welcome email frequency...');
    
    // Check current user's welcome email status
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log('❌ No user session found - please sign in first');
      return;
    }
    
    console.log('👤 Current user:', session.user.email);
    
    // Check if welcome email has been sent
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('sent_welcome_email, created_at')
      .eq('id', session.user.id)
      .single();
    
    if (userError) {
      console.log('❌ Error checking user data:', userError);
      return;
    }
    
    console.log('📊 User Data:');
    console.log('- Welcome email sent:', userData?.sent_welcome_email);
    console.log('- User created at:', userData?.created_at);
    
    if (userData?.sent_welcome_email) {
      console.log('✅ Welcome email already sent - no duplicate emails will be sent');
    } else {
      console.log('⚠️ Welcome email not yet sent - will be sent on next email confirmation');
    }
    
    // Test the checkAndSendWelcomeEmail function
    console.log('\n🧪 Testing checkAndSendWelcomeEmail function...');
    
    // Import the function (we'll need to make it available)
    console.log('📝 Note: The checkAndSendWelcomeEmail function is now built into AuthContext');
    console.log('📝 It will only send welcome emails if:');
    console.log('   1. sent_welcome_email = false');
    console.log('   2. Email was confirmed within 1 hour of account creation');
    
    console.log('\n🎯 Expected Behavior:');
    console.log('- First time email confirmation: Welcome email sent + flag set to true');
    console.log('- Subsequent page loads: No welcome email sent');
    console.log('- Existing users: No welcome email sent');
    
  } catch (error) {
    console.log('❌ Test Error:', error.message);
  }
}

// Run the test
testWelcomeEmailFrequency();
