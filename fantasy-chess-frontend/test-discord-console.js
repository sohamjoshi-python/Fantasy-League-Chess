// Discord Integration Test - Run this in browser console
// Copy and paste this entire script into your browser console on any page

console.log('🧪 Testing Discord Integration...');

// Test configuration
const testConfig = {
  supabaseUrl: 'https://wdbwzvnkfbyzazodfhsw.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NzU2MzIsImV4cCI6MjA2OTE1MTYzMn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8',
  testLeagueName: 'Test League Console',
  testLeagueId: 'test-league-' + Date.now()
};

// Test 1: Basic Discord function call
async function testDiscordFunction() {
  console.log('📡 Testing Discord function call...');
  
  try {
    const response = await fetch(`${testConfig.supabaseUrl}/functions/v1/discord-bot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testConfig.anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create_league_channel',
        leagueName: testConfig.testLeagueName,
        leagueId: testConfig.testLeagueId
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response:', data);
    
    if (response.ok) {
      console.log('✅ Discord function call successful!');
      return true;
    } else {
      console.log('❌ Discord function call failed');
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(data);
        console.log('Error details:', errorData);
        
        if (errorData.details) {
          console.log('🔍 Error details:', errorData.details);
        }
        if (errorData.suggestion) {
          console.log('💡 Suggestion:', errorData.suggestion);
        }
      } catch (e) {
        console.log('Could not parse error response');
      }
      
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error);
    return false;
  }
}

// Test 2: Test with Supabase client (if available)
async function testWithSupabaseClient() {
  console.log('🔧 Testing with Supabase client...');
  
  // Check if Supabase client is available
  if (typeof window.supabase === 'undefined') {
    console.log('⚠️ Supabase client not available in window object');
    return false;
  }
  
  try {
    const response = await window.supabase.functions.invoke('discord-bot', {
      body: {
        action: 'create_league_channel',
        leagueName: testConfig.testLeagueName + ' (Client)',
        leagueId: testConfig.testLeagueId + '-client'
      }
    });
    
    console.log('Supabase client response:', response);
    
    if (response.error) {
      console.log('❌ Supabase client error:', response.error);
      return false;
    } else {
      console.log('✅ Supabase client call successful!');
      return true;
    }
  } catch (error) {
    console.log('❌ Supabase client error:', error);
    return false;
  }
}

// Test 3: Environment variable check
async function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');
  
  try {
    const response = await fetch(`${testConfig.supabaseUrl}/functions/v1/discord-bot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testConfig.anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create_league_channel',
        leagueName: 'ENV_TEST',
        leagueId: 'env-test'
      })
    });

    const data = await response.text();
    
    if (data.includes('DISCORD_BOT_TOKEN') || data.includes('DISCORD_MAIN_SERVER_ID')) {
      console.log('❌ Missing Discord environment variables');
      console.log('Please set in Supabase Dashboard:');
      console.log('- DISCORD_BOT_TOKEN');
      console.log('- DISCORD_MAIN_SERVER_ID');
      return false;
    } else {
      console.log('✅ Environment variables appear to be set');
      return true;
    }
  } catch (error) {
    console.log('❌ Could not check environment variables:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Discord Integration Tests...');
  console.log('=' .repeat(50));
  
  const results = {
    basicCall: await testDiscordFunction(),
    supabaseClient: await testWithSupabaseClient(),
    envCheck: await checkEnvironmentVariables()
  };
  
  console.log('=' .repeat(50));
  console.log('📊 Test Results:');
  console.log('- Basic function call:', results.basicCall ? '✅ PASS' : '❌ FAIL');
  console.log('- Supabase client:', results.supabaseClient ? '✅ PASS' : '❌ FAIL');
  console.log('- Environment check:', results.envCheck ? '✅ PASS' : '❌ FAIL');
  
  if (results.basicCall && results.envCheck) {
    console.log('🎉 Discord integration is working!');
    console.log('You can now create leagues and Discord channels will be created automatically.');
  } else {
    console.log('🔧 Discord integration needs attention:');
    console.log('1. Check Discord environment variables in Supabase');
    console.log('2. Verify Discord bot token is valid');
    console.log('3. Ensure bot is added to Discord server');
  }
  
  return results;
}

// Auto-run the tests
runAllTests().catch(console.error);

// Export functions for manual testing
window.discordTest = {
  testDiscordFunction,
  testWithSupabaseClient,
  checkEnvironmentVariables,
  runAllTests,
  testConfig
};

console.log('💡 Manual testing available: window.discordTest.runAllTests()'); 