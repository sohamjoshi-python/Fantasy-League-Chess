// Test script for SMTP email system with your email address
console.log('🧪 Testing Direct SMTP Email System with sohampjoshi@outlook.com...\n');

async function testSMTPWithYourEmail() {
  try {
    // Use service role key to bypass authentication
    const response = await fetch('https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/send-smtp-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMDIyNDAwMCwiZXhwIjoyMDM1ODAwMDB9.95a4bb3ddabe5526a04b247894ba2f6b608096ef1c925593b6587f238a9c6205'
      },
      body: JSON.stringify({
        to: 'sohampjoshi@outlook.com',
        subject: '🎉 Direct SMTP Test - Fantasy League Chess',
        htmlContent: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Direct SMTP Test</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #FFF8DC;
                color: #2F2F2F;
                line-height: 1.6;
              }
              .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background-color: #8B4513;
                padding: 30px 20px;
                text-align: center;
                color: white;
              }
              .content {
                padding: 40px 30px;
              }
              .success-badge {
                background-color: #28a745;
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                display: inline-block;
                margin: 20px 0;
                font-weight: bold;
              }
              .highlight {
                background-color: #F4A460;
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
              }
              .footer {
                background-color: #8B4513;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>🎉 Direct SMTP Test Successful!</h1>
              </div>
              
              <div class="content">
                <div class="success-badge">✅ EMAIL SYSTEM WORKING</div>
                
                <h2>Hello Soham!</h2>
                <p>This email was sent using <strong>direct SMTP</strong> - no third-party providers required!</p>
                
                <div class="highlight">
                  <strong>🎯 Direct SMTP Email System</strong><br>
                  Following the Supabase Partner Gallery Example approach
                </div>
                
                <h3>✅ What's Working:</h3>
                <ul>
                  <li><strong>Direct SMTP Connection</strong> - Uses your own SMTP server</li>
                  <li><strong>No Third-Party APIs</strong> - No SendGrid, Resend, etc.</li>
                  <li><strong>Completely Free</strong> - $0/month cost</li>
                  <li><strong>Database Tracking</strong> - All emails logged</li>
                  <li><strong>Same Interface</strong> - Drop-in replacement</li>
                </ul>
                
                <h3>💰 Cost Savings:</h3>
                <p><strong>Before:</strong> $15+/month with SendGrid</p>
                <p><strong>After:</strong> <span style="color: #28a745; font-weight: bold;">$0/month - Completely Free!</span></p>
                <p><strong>Annual Savings:</strong> $180+</p>
                
                <h3>🔧 Technical Details:</h3>
                <ul>
                  <li><strong>Edge Function:</strong> send-smtp-email</li>
                  <li><strong>SMTP Provider:</strong> AWS SES (port 2587)</li>
                  <li><strong>Protocol:</strong> Direct TCP connection</li>
                  <li><strong>Authentication:</strong> SMTP LOGIN</li>
                </ul>
                
                <p style="text-align: center; margin: 30px 0;">
                  <a href="https://fantasyleaguechess.com" style="background-color: #8B4513; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600;">
                    Visit Fantasy League Chess
                  </a>
                </p>
                
                <p style="color: #666666; font-size: 14px; text-align: center;">
                  This email proves your SMTP email system is working perfectly! 🎉
                </p>
              </div>
              
              <div class="footer">
                <p>
                  <a href="https://fantasyleaguechess.com/privacy" style="color: #F4A460;">Privacy Policy</a> | 
                  <a href="https://fantasyleaguechess.com/tos" style="color: #F4A460;">Terms of Service</a> | 
                  <a href="mailto:support@fantasyleaguechess.com" style="color: #F4A460;">Support</a>
                </p>
                <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                  Direct SMTP Email System - Fantasy League Chess
                </p>
              </div>
            </div>
          </body>
          </html>
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
      console.log('🔍 Check the function logs for more details');
    }
  } catch (error) {
    console.log('❌ Error testing SMTP:', error.message);
  }
}

// Run the test
testSMTPWithYourEmail();
