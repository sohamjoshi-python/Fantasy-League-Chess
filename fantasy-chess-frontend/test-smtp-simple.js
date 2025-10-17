// Simple test for SMTP email system
console.log('🧪 Testing Direct SMTP Email System...\n');

// Test the function directly
async function testSMTPFunction() {
  try {
    const response = await fetch('https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/send-smtp-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need a valid session token
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAyMjQwMDAsImV4cCI6MjAzNTgwMDAwfQ.4aec4b6cbb90e4c614137883dcb2a5149ffb5bf3400027db35cc48034a882919'
      },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Direct SMTP Test',
        htmlContent: `
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
      })
    });

    const result = await response.text();
    console.log('📧 SMTP Function Response:', result);
    
    if (response.ok) {
      console.log('✅ SMTP email system is working!');
    } else {
      console.log('❌ SMTP email system error:', result);
    }
  } catch (error) {
    console.log('❌ Error testing SMTP:', error.message);
  }
}

// Run the test
testSMTPFunction();
