// Test All Email Types - Complete Email System Test
// Run this in your browser console

console.log('🧪 Testing All Email Types - Complete Email System Test...\n');

async function testAllEmailTypes() {
  try {
    console.log('📧 Testing all email types in Fantasy League Chess...\n');
    
    // Import the email functions
    const { sendCustomEmail, sendWelcomeEmail, sendWeeklyResultsEmail } = await import('./src/lib/resend-email');
    
    const testEmail = 'sohampjoshi@outlook.com';
    
    console.log('🎯 Test Email:', testEmail);
    console.log('📝 Note: All emails will be sent via Resend API\n');
    
    // Test 1: Custom Email
    console.log('🧪 Test 1: Custom Email');
    console.log('📧 Sending custom email...');
    
    const customResult = await sendCustomEmail(
      testEmail,
      '🎉 Fantasy League Chess - Custom Email Test',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>Custom Email Test</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>Hello there!</p>
            <p>This is a test of the <strong>custom email</strong> functionality in Fantasy League Chess.</p>
            <p>This email was sent via the Resend API using our custom email system.</p>
            <p>If you received this email, the custom email system is working correctly!</p>
            <p>Best regards,<br>The Fantasy League Chess Team</p>
          </div>
        </div>
      `
    );
    
    console.log('📧 Custom Email Result:', customResult);
    console.log('Status:', customResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!customResult.success) {
      console.log('Error:', customResult.error);
    }
    
    // Test 2: Welcome Email
    console.log('\n🧪 Test 2: Welcome Email');
    console.log('📧 Sending welcome email...');
    
    const welcomeResult = await sendWelcomeEmail(testEmail);
    
    console.log('📧 Welcome Email Result:', welcomeResult);
    console.log('Status:', welcomeResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!welcomeResult.success) {
      console.log('Error:', welcomeResult.error);
    }
    
    // Test 3: Weekly Results Email
    console.log('\n🧪 Test 3: Weekly Results Email');
    console.log('📧 Sending weekly results email...');
    
    const weeklyResult = await sendWeeklyResultsEmail(testEmail, {
      week: '2024-01-15',
      totalPoints: 125.5,
      rank: 3,
      leagueName: 'Test League',
      games: [
        { player: 'Hikaru', points: 45.2, accuracy: 92.5 },
        { player: 'Magnus', points: 38.7, accuracy: 89.1 },
        { player: 'Fabiano', points: 41.6, accuracy: 91.3 }
      ]
    });
    
    console.log('📧 Weekly Results Email Result:', weeklyResult);
    console.log('Status:', weeklyResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!weeklyResult.success) {
      console.log('Error:', weeklyResult.error);
    }
    
    // Test 4: League Invitation Email (Custom)
    console.log('\n🧪 Test 4: League Invitation Email');
    console.log('📧 Sending league invitation email...');
    
    const invitationResult = await sendCustomEmail(
      testEmail,
      '🏆 You\'re Invited to Join a Fantasy League Chess League!',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>🏆 League Invitation</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>Hello!</p>
            <p>You've been invited to join <strong>"Chess Masters League"</strong> on Fantasy League Chess!</p>
            <p><strong>League Details:</strong></p>
            <ul>
              <li>Entry Fee: 100 coins</li>
              <li>Prize Pool: 500 coins</li>
              <li>Start Date: January 20, 2024</li>
              <li>Format: Snake Draft</li>
            </ul>
            <p>Click the button below to join the league:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://fantasyleaguechess.com/join-league" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Join League
              </a>
            </div>
            <p>Good luck and happy strategizing!</p>
            <p>The Fantasy League Chess Team</p>
          </div>
        </div>
      `
    );
    
    console.log('📧 League Invitation Email Result:', invitationResult);
    console.log('Status:', invitationResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!invitationResult.success) {
      console.log('Error:', invitationResult.error);
    }
    
    // Test 5: Password Reset Email (Custom)
    console.log('\n🧪 Test 5: Password Reset Email');
    console.log('📧 Sending password reset email...');
    
    const passwordResetResult = await sendCustomEmail(
      testEmail,
      '🔐 Password Reset Request - Fantasy League Chess',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ff6b6b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>🔐 Password Reset</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>Hello!</p>
            <p>We received a request to reset your password for your Fantasy League Chess account.</p>
            <p>If you made this request, click the button below to reset your password:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://fantasyleaguechess.com/reset-password" 
                 style="background-color: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>The Fantasy League Chess Team</p>
          </div>
        </div>
      `
    );
    
    console.log('📧 Password Reset Email Result:', passwordResetResult);
    console.log('Status:', passwordResetResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!passwordResetResult.success) {
      console.log('Error:', passwordResetResult.error);
    }
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log(`Custom Email: ${customResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Welcome Email: ${welcomeResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Weekly Results: ${weeklyResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`League Invitation: ${invitationResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Password Reset: ${passwordResetResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    const successCount = [customResult, welcomeResult, weeklyResult, invitationResult, passwordResetResult]
      .filter(result => result.success).length;
    
    console.log(`\n🎯 Overall Result: ${successCount}/5 emails sent successfully`);
    
    if (successCount === 5) {
      console.log('🎉 All email types are working perfectly!');
      console.log('📬 Check your inbox for all test emails');
      console.log('🔍 Check Resend dashboard: https://resend.com/emails');
    } else {
      console.log('⚠️ Some email types failed - check the errors above');
      console.log('🔍 Check Resend API key and configuration');
    }
    
  } catch (error) {
    console.log('❌ Test Error:', error.message);
    console.log('🔍 Check if Resend Edge Function is deployed and configured');
  }
}

// Run the test
testAllEmailTypes();
