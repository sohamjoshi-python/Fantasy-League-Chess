// Manual welcome email test for your existing account
// Run this in your browser console while logged into Fantasy League Chess

console.log('🧪 Manual Welcome Email Test for sohampjoshi@outlook.com...\n');

async function sendManualWelcomeEmail() {
  try {
    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ No active session. Please log in first.');
      return;
    }

    console.log('👤 Current user:', session.user.email);
    console.log('📧 Sending welcome email to sohampjoshi@outlook.com...');
    
    // Import the email function
    const { sendWelcomeEmail } = await import('./src/lib/free-email');
    
    const result = await sendWelcomeEmail('sohampjoshi@outlook.com');
    
    if (result.success) {
      console.log('✅ SUCCESS! Welcome email sent to sohampjoshi@outlook.com');
      console.log('📬 Check your Outlook inbox for the welcome email');
      console.log('🎉 Your direct SMTP email system is working perfectly!');
      console.log('💰 Total monthly cost: $0');
    } else {
      console.log('❌ Welcome email failed:', result.error);
      console.log('🔍 This might be due to SMTP configuration or authentication');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Alternative: Test custom email
async function sendCustomTestEmail() {
  try {
    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ No active session. Please log in first.');
      return;
    }

    console.log('👤 Current user:', session.user.email);
    console.log('📧 Sending custom test email to sohampjoshi@outlook.com...');
    
    // Import the email function
    const { sendCustomEmail } = await import('./src/lib/free-email');
    
    const result = await sendCustomEmail(
      'sohampjoshi@outlook.com',
      '🎉 Direct SMTP Test - Fantasy League Chess',
      `
        <h1>🎉 Direct SMTP Test Successful!</h1>
        <p>Hello Soham!</p>
        <p>This email was sent using <strong>direct SMTP</strong> - no third-party providers required!</p>
        
        <h2>✅ What's Working:</h2>
        <ul>
          <li><strong>Direct SMTP Connection</strong> - Uses your own SMTP server</li>
          <li><strong>No Third-Party APIs</strong> - No SendGrid, Resend, etc.</li>
          <li><strong>Completely Free</strong> - $0/month cost</li>
          <li><strong>Database Tracking</strong> - All emails logged</li>
        </ul>
        
        <h2>💰 Cost Savings:</h2>
        <p><strong>Before:</strong> $15+/month with SendGrid</p>
        <p><strong>After:</strong> <span style="color: green; font-weight: bold;">$0/month - Completely Free!</span></p>
        <p><strong>Annual Savings:</strong> $180+</p>
        
        <p>This email proves your SMTP email system is working perfectly! 🎉</p>
      `
    );
    
    if (result.success) {
      console.log('✅ SUCCESS! Custom email sent to sohampjoshi@outlook.com');
      console.log('📬 Check your Outlook inbox for the test email');
      console.log('🎉 Your direct SMTP email system is working perfectly!');
    } else {
      console.log('❌ Custom email failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

console.log('📋 Instructions:');
console.log('1. Go to your Fantasy League Chess website');
console.log('2. Make sure you\'re logged in');
console.log('3. Open browser console (F12)');
console.log('4. Run: sendManualWelcomeEmail()');
console.log('5. Or run: sendCustomTestEmail()');
console.log('6. Check your Outlook inbox!');

// Export functions for use in browser console
window.sendManualWelcomeEmail = sendManualWelcomeEmail;
window.sendCustomTestEmail = sendCustomTestEmail;
