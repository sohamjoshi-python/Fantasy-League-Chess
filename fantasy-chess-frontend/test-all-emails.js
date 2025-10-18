// Complete Email Testing Script
// Run this in your browser console while on Fantasy League Chess website

console.log('📧 Complete Email Testing Script for Fantasy League Chess\n');

async function testWelcomeEmail() {
  try {
    console.log('1. 🧪 Testing Welcome Email...');
    
    // Import the email function
    const { sendWelcomeEmail } = await import('./src/lib/free-email');
    
    const result = await sendWelcomeEmail('sohampjoshi@outlook.com');
    
    if (result.success) {
      console.log('✅ Welcome Email: SENT SUCCESSFULLY');
      console.log('📬 Check your Outlook inbox for the welcome email');
    } else {
      console.log('❌ Welcome Email: FAILED -', result.error);
    }
  } catch (error) {
    console.log('❌ Welcome Email Error:', error.message);
  }
}

async function testCustomEmail() {
  try {
    console.log('2. 🧪 Testing Custom Email...');
    
    // Import the email function
    const { sendCustomEmail } = await import('./src/lib/free-email');
    
    const result = await sendCustomEmail(
      'sohampjoshi@outlook.com',
      '🎉 Custom Email Test - Fantasy League Chess',
      `
        <h1>🎉 Custom Email Test Successful!</h1>
        <p>Hello Soham!</p>
        <p>This is a test of the custom email system.</p>
        
        <h2>✅ What's Working:</h2>
        <ul>
          <li><strong>Direct SMTP Connection</strong> - Uses your own SMTP server</li>
          <li><strong>HTML Email Support</strong> - Beautiful styling</li>
          <li><strong>Custom Content</strong> - Any HTML content</li>
          <li><strong>$0/month Cost</strong> - Completely free!</li>
        </ul>
        
        <h2>💰 Cost Savings:</h2>
        <p><strong>Before:</strong> $15+/month with SendGrid</p>
        <p><strong>After:</strong> <span style="color: green; font-weight: bold;">$0/month - Completely Free!</span></p>
        
        <p>This email proves your custom email system is working perfectly! 🎉</p>
      `
    );
    
    if (result.success) {
      console.log('✅ Custom Email: SENT SUCCESSFULLY');
      console.log('📬 Check your Outlook inbox for the custom email');
    } else {
      console.log('❌ Custom Email: FAILED -', result.error);
    }
  } catch (error) {
    console.log('❌ Custom Email Error:', error.message);
  }
}

async function testWeeklyResultsEmail() {
  try {
    console.log('3. 🧪 Testing Weekly Results Email...');
    
    // Import the email function
    const { sendWeeklyResultsEmail } = await import('./src/lib/free-email');
    
    const result = await sendWeeklyResultsEmail('sohampjoshi@outlook.com', {
      week: '2024-01-15',
      totalPoints: 1250,
      leagues: [
        { name: 'Test League 1', points: 750, rank: 1 },
        { name: 'Test League 2', points: 500, rank: 3 }
      ]
    });
    
    if (result.success) {
      console.log('✅ Weekly Results Email: SENT SUCCESSFULLY');
      console.log('📬 Check your Outlook inbox for the weekly results email');
    } else {
      console.log('❌ Weekly Results Email: FAILED -', result.error);
    }
  } catch (error) {
    console.log('❌ Weekly Results Email Error:', error.message);
  }
}

async function testAllEmails() {
  console.log('🚀 Starting Complete Email Test Suite...\n');
  
  await testWelcomeEmail();
  console.log(''); // Empty line
  
  await testCustomEmail();
  console.log(''); // Empty line
  
  await testWeeklyResultsEmail();
  console.log(''); // Empty line
  
  console.log('🎉 Email testing complete!');
  console.log('📬 Check your Outlook inbox (sohampjoshi@outlook.com) for all test emails!');
  console.log('💰 Total monthly cost: $0');
}

// Export functions for individual testing
window.testWelcomeEmail = testWelcomeEmail;
window.testCustomEmail = testCustomEmail;
window.testWeeklyResultsEmail = testWeeklyResultsEmail;
window.testAllEmails = testAllEmails;

console.log('📋 Available test functions:');
console.log('- testWelcomeEmail() - Test welcome email');
console.log('- testCustomEmail() - Test custom email');
console.log('- testWeeklyResultsEmail() - Test weekly results email');
console.log('- testAllEmails() - Test all email types');
console.log('\n🚀 Run testAllEmails() to test everything!');
