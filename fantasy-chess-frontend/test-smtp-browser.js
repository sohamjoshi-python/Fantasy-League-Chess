// Test script to run in your browser console
// This will test the SMTP email system through your actual app

console.log('🧪 Testing Direct SMTP Email System through Fantasy League Chess App...\n');

// This function should be run in your browser console while on the Fantasy League Chess website
async function testSMTPThroughApp() {
  try {
    // Import the free email functions (assuming they're available globally)
    if (typeof sendWelcomeEmail === 'undefined') {
      console.log('❌ Email functions not available. Make sure you\'re on the Fantasy League Chess website.');
      return;
    }

    console.log('📧 Sending test email to sohampjoshi@outlook.com...');
    
    // Test welcome email
    const result = await sendWelcomeEmail('sohampjoshi@outlook.com');
    
    if (result.success) {
      console.log('✅ SUCCESS! Email sent to sohampjoshi@outlook.com');
      console.log('📬 Check your Outlook inbox for the welcome email');
      console.log('🎉 Your direct SMTP email system is working perfectly!');
      console.log('💰 Total monthly cost: $0');
    } else {
      console.log('❌ Email failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Alternative: Test custom email
async function testCustomEmail() {
  try {
    if (typeof sendCustomEmail === 'undefined') {
      console.log('❌ Email functions not available. Make sure you\'re on the Fantasy League Chess website.');
      return;
    }

    console.log('📧 Sending custom test email to sohampjoshi@outlook.com...');
    
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
console.log('2. Open browser console (F12)');
console.log('3. Run: testSMTPThroughApp()');
console.log('4. Or run: testCustomEmail()');
console.log('5. Check your Outlook inbox!');

// Export functions for use in browser console
window.testSMTPThroughApp = testSMTPThroughApp;
window.testCustomEmail = testCustomEmail;
