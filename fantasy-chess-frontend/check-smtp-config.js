// Check SMTP Configuration Status
// Run this in your browser console

console.log('🔍 Checking SMTP Configuration...\n');

async function checkSMTPConfig() {
  try {
    console.log('🧪 Testing SMTP configuration...');
    
    // Test with a simple email to see the exact error
    const { sendCustomEmail } = await import('./src/lib/free-email');
    
    const result = await sendCustomEmail(
      'sohampjoshi@outlook.com',
      'SMTP Config Test',
      '<h1>SMTP Configuration Test</h1><p>Testing SMTP settings...</p>'
    );
    
    console.log('📧 SMTP Test Result:', result);
    
    if (result.success) {
      console.log('✅ SMTP Configuration: WORKING');
      console.log('📬 Check your inbox for the test email');
    } else {
      console.log('❌ SMTP Configuration: FAILED');
      console.log('Error:', result.error);
      
      // Common SMTP errors
      if (result.error.includes('authentication') || result.error.includes('login')) {
        console.log('🔍 Issue: SMTP Authentication Failed');
        console.log('💡 Check SMTP username and password in Supabase');
      } else if (result.error.includes('connection') || result.error.includes('timeout')) {
        console.log('🔍 Issue: SMTP Connection Failed');
        console.log('💡 Check SMTP host and port settings');
      } else if (result.error.includes('permission') || result.error.includes('denied')) {
        console.log('🔍 Issue: SMTP Permission Denied');
        console.log('💡 Check SMTP credentials and permissions');
      } else {
        console.log('🔍 Issue: Unknown SMTP Error');
        console.log('💡 Check Supabase SMTP configuration');
      }
    }
  } catch (error) {
    console.log('❌ SMTP Test Error:', error.message);
  }
}

// Run the check
checkSMTPConfig();
