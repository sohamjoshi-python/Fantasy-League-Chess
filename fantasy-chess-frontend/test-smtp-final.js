// Simple test for SMTP email system
const testEmail = async () => {
  try {
    const response = await fetch('https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/send-smtp-email-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: 'sohampjoshi@outlook.com',
        subject: '🎉 Direct SMTP Test - Fantasy League Chess',
        htmlContent: `
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
      })
    });

    const result = await response.text();
    console.log('📧 SMTP Function Response:', result);
    
    if (response.ok) {
      console.log('✅ SUCCESS! Email sent to sohampjoshi@outlook.com');
      console.log('📬 Check your Outlook inbox for the test email');
      console.log('🎉 Your direct SMTP email system is working perfectly!');
    } else {
      console.log('❌ SMTP email system error:', result);
    }
  } catch (error) {
    console.log('❌ Error testing SMTP:', error.message);
  }
};

// Run the test
testEmail();
