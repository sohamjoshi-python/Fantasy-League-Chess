// Test script for the Direct SMTP email system
import { sendWelcomeEmail, sendCustomEmail } from './src/lib/free-email';

async function testSMTPEmailSystem() {
  console.log('🧪 Testing Direct SMTP Email System...\n');

  // Test 1: Welcome Email
  console.log('📧 Test 1: Sending Welcome Email via SMTP');
  try {
    const result1 = await sendWelcomeEmail('test@example.com');
    console.log('✅ Welcome Email Result:', result1);
  } catch (error) {
    console.log('❌ Welcome Email Error:', error);
  }

  // Test 2: Custom Email
  console.log('\n📧 Test 2: Sending Custom Email via SMTP');
  try {
    const result2 = await sendCustomEmail(
      'test@example.com',
      'Test Subject - Direct SMTP System',
      `
        <h1>🎉 Direct SMTP Email Test</h1>
        <p>This email was sent using <strong>direct SMTP</strong> - no third-party providers!</p>
        <ul>
          <li>✅ Direct SMTP connection</li>
          <li>✅ No third-party APIs</li>
          <li>✅ Uses your own SMTP server</li>
          <li>✅ Completely free</li>
        </ul>
        <p><strong>Total Cost: $0/month</strong></p>
        <p>Following the <a href="https://github.com/supabase-community/partner-gallery-example">Supabase Partner Gallery Example</a> approach!</p>
      `
    );
    console.log('✅ Custom Email Result:', result2);
  } catch (error) {
    console.log('❌ Custom Email Error:', error);
  }

  console.log('\n🎯 Direct SMTP Email System Test Complete!');
  console.log('Check the Supabase Edge Function logs for detailed SMTP connection info.');
  console.log('If SMTP is not configured, emails will be logged to console instead.');
}

// Run the test
testSMTPEmailSystem().catch(console.error);
