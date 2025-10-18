// Copy and paste this entire code into your browser console
// Then run: testSMTPDirectly()

console.log('📧 Testing SMTP Email System Directly...\n');

async function testSMTPDirectly() {
  try {
    console.log('🧪 Testing direct SMTP email to sohampjoshi@outlook.com...');
    
    // Import the email function
    const { sendCustomEmail } = await import('./src/lib/free-email');
    
    const result = await sendCustomEmail(
      'sohampjoshi@outlook.com',
      '🧪 Direct SMTP Test - Fantasy League Chess',
      `
        <h1>🧪 Direct SMTP Test</h1>
        <p>Hello Soham!</p>
        <p>This is a direct test of the SMTP email system.</p>
        
        <h2>✅ What's Being Tested:</h2>
        <ul>
          <li><strong>Direct SMTP Connection</strong> - Uses your own SMTP server</li>
          <li><strong>HTML Email Support</strong> - Beautiful styling</li>
          <li><strong>Custom Content</strong> - Any HTML content</li>
          <li><strong>$0/month Cost</strong> - Completely free!</li>
        </ul>
        
        <h2>🔍 Debug Information:</h2>
        <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Test Type:</strong> Direct SMTP Test</p>
        <p><strong>Email System:</strong> Direct SMTP (no third-party providers)</p>
        
        <p>If you receive this email, your SMTP system is working perfectly! 🎉</p>
      `
    );
    
    if (result.success) {
      console.log('✅ SMTP Test: SUCCESS');
      console.log('📬 Check your Outlook inbox for the test email');
      console.log('🎉 Your direct SMTP email system is working!');
      console.log('💰 Total monthly cost: $0');
    } else {
      console.log('❌ SMTP Test: FAILED');
      console.log('Error:', result.error);
      console.log('🔍 This indicates an SMTP configuration issue');
    }
  } catch (error) {
    console.log('❌ SMTP Test Error:', error.message);
  }
}

async function testWelcomeEmailDirectly() {
  try {
    console.log('🧪 Testing welcome email directly...');
    
    // Import the email function
    const { sendWelcomeEmail } = await import('./src/lib/free-email');
    
    const result = await sendWelcomeEmail('sohampjoshi@outlook.com');
    
    if (result.success) {
      console.log('✅ Welcome Email Test: SUCCESS');
      console.log('📬 Check your Outlook inbox for the welcome email');
    } else {
      console.log('❌ Welcome Email Test: FAILED');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('❌ Welcome Email Test Error:', error.message);
  }
}

// Now you can run:
// testSMTPDirectly()
// testWelcomeEmailDirectly()

console.log('📋 Available functions:');
console.log('- testSMTPDirectly()');
console.log('- testWelcomeEmailDirectly()');
console.log('\n🚀 Run testSMTPDirectly() to test the SMTP system!');
