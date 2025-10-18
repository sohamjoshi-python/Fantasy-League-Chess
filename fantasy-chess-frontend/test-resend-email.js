// Test Resend Email System
// Run this in your browser console

console.log('🧪 Testing Resend Email System...\n');

async function testResendEmail() {
  try {
    console.log('📧 Testing Resend email system...');
    
    // Import the Resend email functions
    const { sendCustomEmail, sendWelcomeEmail } = await import('./src/lib/resend-email');
    
    // Test 1: Custom Email
    console.log('🧪 Test 1: Custom Email');
    const customResult = await sendCustomEmail(
      'sohampjoshi@outlook.com',
      '🎉 Resend Email Test - Custom',
      '<h1>Resend Email Test</h1><p>Testing Resend integration with custom email!</p><p>This email was sent via Resend API.</p>'
    );
    
    console.log('📧 Custom Email Result:', customResult);
    
    if (customResult.success) {
      console.log('✅ Custom Email: SUCCESS');
    } else {
      console.log('❌ Custom Email: FAILED');
      console.log('Error:', customResult.error);
    }
    
    // Test 2: Welcome Email
    console.log('\n🧪 Test 2: Welcome Email');
    const welcomeResult = await sendWelcomeEmail('sohampjoshi@outlook.com');
    
    console.log('📧 Welcome Email Result:', welcomeResult);
    
    if (welcomeResult.success) {
      console.log('✅ Welcome Email: SUCCESS');
    } else {
      console.log('❌ Welcome Email: FAILED');
      console.log('Error:', welcomeResult.error);
    }
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`Custom Email: ${customResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Welcome Email: ${welcomeResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (customResult.success || welcomeResult.success) {
      console.log('\n🎉 Resend Email System: WORKING');
      console.log('📬 Check your inbox for test emails');
      console.log('🔍 Check Resend dashboard: https://resend.com/emails');
    } else {
      console.log('\n❌ Resend Email System: FAILED');
      console.log('🔍 Check Resend API key and configuration');
    }
    
  } catch (error) {
    console.log('❌ Resend Test Error:', error.message);
    console.log('🔍 Check if Resend Edge Function is deployed');
  }
}

// Run the test
testResendEmail();
