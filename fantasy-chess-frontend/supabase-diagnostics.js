// Test Supabase connection and signup process
// Run this in your browser console while on the Fantasy League Chess website

console.log('🧪 Testing Supabase Connection and Signup Process...\n');

async function testSupabaseConnection() {
  try {
    // Test basic connection
    console.log('1. Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log('❌ Supabase connection failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    
    // Test auth service
    console.log('2. Testing auth service...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ Auth service error:', authError);
      return false;
    }
    
    console.log('✅ Auth service working');
    console.log('Current session:', authData.session ? 'Active' : 'None');
    
    return true;
  } catch (error) {
    console.log('❌ Connection test failed:', error);
    return false;
  }
}

async function testSignupProcess() {
  try {
    console.log('3. Testing signup process...');
    
    // Use a test email that won't conflict
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    const testDisplayName = 'Test User';
    
    console.log('Test email:', testEmail);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: { display_name: testDisplayName },
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });
    
    if (error) {
      console.log('❌ Signup test failed:', error);
      console.log('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText
      });
      return false;
    }
    
    console.log('✅ Signup test successful');
    console.log('User created:', data.user?.id);
    console.log('Email confirmation required:', !data.user?.email_confirmed_at);
    
    return true;
  } catch (error) {
    console.log('❌ Signup test failed with exception:', error);
    return false;
  }
}

async function runDiagnostics() {
  console.log('🔍 Running Supabase Diagnostics...\n');
  
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.log('❌ Basic connection failed. Check your Supabase configuration.');
    return;
  }
  
  const signupOk = await testSignupProcess();
  if (!signupOk) {
    console.log('❌ Signup process failed. This might be due to:');
    console.log('   - Email confirmation settings in Supabase');
    console.log('   - SMTP configuration issues');
    console.log('   - Database permissions');
    console.log('   - Rate limiting');
  } else {
    console.log('✅ All tests passed! Supabase is working correctly.');
  }
}

// Export functions for use in browser console
window.testSupabaseConnection = testSupabaseConnection;
window.testSignupProcess = testSignupProcess;
window.runDiagnostics = runDiagnostics;

console.log('📋 Available test functions:');
console.log('- testSupabaseConnection()');
console.log('- testSignupProcess()');
console.log('- runDiagnostics()');
console.log('\nRun runDiagnostics() to test everything!');
