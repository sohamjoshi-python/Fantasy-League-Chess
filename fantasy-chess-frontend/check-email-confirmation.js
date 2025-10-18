// Check if your account has email_confirmed_at set
// Run this in your browser console while logged into Fantasy League Chess

console.log('🔍 Checking Email Confirmation Status...\n');

async function checkEmailConfirmationStatus() {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ No active session. Please log in first.');
      return;
    }

    console.log('👤 Current user:', session.user.email);
    console.log('📅 User created at:', session.user.created_at);
    console.log('✅ Email confirmed at:', session.user.email_confirmed_at);
    
    if (session.user.email_confirmed_at) {
      console.log('✅ Email is confirmed!');
      
      // Calculate time difference
      const createdAt = new Date(session.user.created_at);
      const confirmedAt = new Date(session.user.email_confirmed_at);
      const timeDiff = confirmedAt.getTime() - createdAt.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);
      
      console.log('⏰ Hours between creation and confirmation:', hoursDiff);
      
      if (hoursDiff < 24) {
        console.log('✅ User is eligible for welcome email (created within 24 hours)');
        
        // Try to send welcome email manually
        console.log('📧 Attempting to send welcome email...');
        const { sendWelcomeEmail } = await import('./src/lib/free-email');
        const result = await sendWelcomeEmail(session.user.email);
        
        if (result.success) {
          console.log('✅ Welcome email sent successfully!');
          console.log('📬 Check your inbox for the welcome email');
        } else {
          console.log('❌ Welcome email failed:', result.error);
        }
      } else {
        console.log('❌ User is too old for welcome email (created more than 24 hours ago)');
        console.log('💡 Try signing up with a new email to test welcome email');
      }
    } else {
      console.log('❌ Email is NOT confirmed');
      console.log('💡 You need to enable email confirmation in Supabase settings');
      console.log('💡 Or sign up with a new email and confirm it');
    }
  } catch (error) {
    console.log('❌ Error checking status:', error.message);
  }
}

// Export function for use in browser console
window.checkEmailConfirmationStatus = checkEmailConfirmationStatus;

console.log('📋 Run checkEmailConfirmationStatus() to check your email confirmation status');
