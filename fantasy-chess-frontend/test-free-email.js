// Test script for the free email system
import { sendWelcomeEmail, sendCustomEmail } from './src/lib/free-email';

async function testFreeEmailSystem() {
  console.log('🧪 Testing Free Email System...\n');

  // Test 1: Welcome Email
  console.log('📧 Test 1: Sending Welcome Email');
  try {
    const result1 = await sendWelcomeEmail('test@example.com');
    console.log('✅ Welcome Email Result:', result1);
  } catch (error) {
    console.log('❌ Welcome Email Error:', error);
  }

  // Test 2: Custom Email
  console.log('\n📧 Test 2: Sending Custom Email');
  try {
    const result2 = await sendCustomEmail(
      'test@example.com',
      'Test Subject - Free Email System',
      `
        <h1>🎉 Free Email System Test</h1>
        <p>This email was sent using our <strong>completely free</strong> email system!</p>
        <ul>
          <li>✅ No SendGrid required</li>
          <li>✅ Multiple free providers</li>
          <li>✅ Automatic fallbacks</li>
          <li>✅ Database tracking</li>
        </ul>
        <p><strong>Total Cost: $0/month</strong></p>
      `
    );
    console.log('✅ Custom Email Result:', result2);
  } catch (error) {
    console.log('❌ Custom Email Error:', error);
  }

  console.log('\n🎯 Free Email System Test Complete!');
  console.log('Check the Supabase Edge Function logs for detailed results.');
}

// Run the test
testFreeEmailSystem().catch(console.error);
