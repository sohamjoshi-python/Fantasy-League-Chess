// Test Individual Email Types - Quick Tests
// Run this in your browser console

console.log('🧪 Testing Individual Email Types - Quick Tests...\n');

// Test 1: Custom Email Only
async function testCustomEmail() {
  try {
    console.log('📧 Testing Custom Email...');
    
    const { sendCustomEmail } = await import('./src/lib/resend-email');
    
    const result = await sendCustomEmail(
      'sohampjoshi@outlook.com',
      '🎉 Custom Email Test - Fantasy League Chess',
      '<h1>Custom Email Test</h1><p>This is a test of the custom email functionality!</p>'
    );
    
    console.log('📧 Custom Email Result:', result);
    console.log('Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    
    return result.success;
  } catch (error) {
    console.log('❌ Custom Email Error:', error.message);
    return false;
  }
}

// Test 2: Welcome Email Only
async function testWelcomeEmail() {
  try {
    console.log('📧 Testing Welcome Email...');
    
    const { sendWelcomeEmail } = await import('./src/lib/resend-email');
    
    const result = await sendWelcomeEmail('sohampjoshi@outlook.com');
    
    console.log('📧 Welcome Email Result:', result);
    console.log('Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    
    return result.success;
  } catch (error) {
    console.log('❌ Welcome Email Error:', error.message);
    return false;
  }
}

// Test 3: Weekly Results Email Only
async function testWeeklyResultsEmail() {
  try {
    console.log('📧 Testing Weekly Results Email...');
    
    const { sendWeeklyResultsEmail } = await import('./src/lib/resend-email');
    
    const result = await sendWeeklyResultsEmail('sohampjoshi@outlook.com', {
      week: '2024-01-15',
      totalPoints: 125.5,
      rank: 3
    });
    
    console.log('📧 Weekly Results Email Result:', result);
    console.log('Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    
    return result.success;
  } catch (error) {
    console.log('❌ Weekly Results Email Error:', error.message);
    return false;
  }
}

// Test 4: League Invitation Email
async function testLeagueInvitationEmail() {
  try {
    console.log('📧 Testing League Invitation Email...');
    
    const { sendCustomEmail } = await import('./src/lib/resend-email');
    
    const result = await sendCustomEmail(
      'sohampjoshi@outlook.com',
      '🏆 League Invitation - Fantasy League Chess',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1>🏆 League Invitation</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px;">
            <p>You've been invited to join <strong>"Chess Masters League"</strong>!</p>
            <p>Entry Fee: 100 coins | Prize Pool: 500 coins</p>
            <p>Click <a href="https://fantasyleaguechess.com/join-league">here</a> to join!</p>
          </div>
        </div>
      `
    );
    
    console.log('📧 League Invitation Email Result:', result);
    console.log('Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    
    return result.success;
  } catch (error) {
    console.log('❌ League Invitation Email Error:', error.message);
    return false;
  }
}

// Test 5: Password Reset Email
async function testPasswordResetEmail() {
  try {
    console.log('📧 Testing Password Reset Email...');
    
    const { sendCustomEmail } = await import('./src/lib/resend-email');
    
    const result = await sendCustomEmail(
      'sohampjoshi@outlook.com',
      '🔐 Password Reset - Fantasy League Chess',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ff6b6b; color: white; padding: 20px; text-align: center;">
            <h1>🔐 Password Reset</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px;">
            <p>We received a request to reset your password.</p>
            <p>Click <a href="https://fantasyleaguechess.com/reset-password">here</a> to reset your password.</p>
            <p>This link expires in 24 hours.</p>
          </div>
        </div>
      `
    );
    
    console.log('📧 Password Reset Email Result:', result);
    console.log('Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    
    return result.success;
  } catch (error) {
    console.log('❌ Password Reset Email Error:', error.message);
    return false;
  }
}

// Run individual tests
console.log('🚀 Running individual email tests...\n');

// Test Custom Email
testCustomEmail().then(success => {
  console.log('Custom Email Test:', success ? '✅ PASSED' : '❌ FAILED');
});

// Test Welcome Email
testWelcomeEmail().then(success => {
  console.log('Welcome Email Test:', success ? '✅ PASSED' : '❌ FAILED');
});

// Test Weekly Results Email
testWeeklyResultsEmail().then(success => {
  console.log('Weekly Results Email Test:', success ? '✅ PASSED' : '❌ FAILED');
});

// Test League Invitation Email
testLeagueInvitationEmail().then(success => {
  console.log('League Invitation Email Test:', success ? '✅ PASSED' : '❌ FAILED');
});

// Test Password Reset Email
testPasswordResetEmail().then(success => {
  console.log('Password Reset Email Test:', success ? '✅ PASSED' : '❌ FAILED');
});

console.log('\n📝 Note: Each test runs independently. Check the results above.');
console.log('📬 Check your inbox for test emails');
console.log('🔍 Check Resend dashboard: https://resend.com/emails');
