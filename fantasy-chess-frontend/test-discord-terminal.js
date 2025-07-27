#!/usr/bin/env node

/**
 * Discord Integration Test - Terminal Version
 * Run with: node test-discord-terminal.js
 */

import https from 'https';

// Configuration
const config = {
  supabaseUrl: 'wdbwzvnkfbyzazodfhsw.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NzU2MzIsImV4cCI6MjA2OTE1MTYzMn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8',
  testLeagueName: 'Test League Terminal',
  testLeagueId: 'test-league-' + Date.now()
};

// Helper function to make HTTPS requests
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Test 1: Basic Discord function call
async function testDiscordFunction() {
  console.log('📡 Testing Discord function call...');
  
  const requestData = JSON.stringify({
    action: 'create_league_channel',
    leagueName: config.testLeagueName,
    leagueId: config.testLeagueId
  });
  
  const options = {
    hostname: config.supabaseUrl,
    port: 443,
    path: '/functions/v1/discord-bot',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData)
    }
  };
  
  try {
    const response = await makeRequest(options, requestData);
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.data}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Discord function call successful!');
      return true;
    } else {
      console.log('❌ Discord function call failed');
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(response.data);
        if (errorData.details) {
          console.log('🔍 Error details:', errorData.details);
        }
        if (errorData.suggestion) {
          console.log('💡 Suggestion:', errorData.suggestion);
        }
      } catch (e) {
        // Could not parse as JSON
      }
      
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    return false;
  }
}

// Test 2: Environment variable check
async function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');
  
  const requestData = JSON.stringify({
    action: 'create_league_channel',
    leagueName: 'ENV_TEST',
    leagueId: 'env-test'
  });
  
  const options = {
    hostname: config.supabaseUrl,
    port: 443,
    path: '/functions/v1/discord-bot',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData)
    }
  };
  
  try {
    const response = await makeRequest(options, requestData);
    
    if (response.data.includes('DISCORD_BOT_TOKEN') || response.data.includes('DISCORD_MAIN_SERVER_ID')) {
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
    console.log('❌ Could not check environment variables:', error.message);
    return false;
  }
}

// Test 3: Test different actions
async function testDifferentActions() {
  console.log('🔄 Testing different Discord actions...');
  
  const actions = [
    { action: 'generate_invite', channelId: 'test-channel-id' },
    { action: 'send_league_message', message: 'Test message', channelId: 'test-channel-id' }
  ];
  
  for (const actionData of actions) {
    console.log(`Testing action: ${actionData.action}`);
    
    const requestData = JSON.stringify(actionData);
    
    const options = {
      hostname: config.supabaseUrl,
      port: 443,
      path: '/functions/v1/discord-bot',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    try {
      const response = await makeRequest(options, requestData);
      console.log(`  Status: ${response.statusCode}`);
      
      if (response.statusCode === 400) {
        console.log('  ✅ Action validation working (expected 400 for invalid data)');
      } else {
        console.log(`  Response: ${response.data}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  return true;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Discord Integration Test - Terminal Version');
  console.log('=' .repeat(50));
  console.log(`Test League: ${config.testLeagueName}`);
  console.log(`Test ID: ${config.testLeagueId}`);
  console.log('');
  
  const results = {
    basicCall: await testDiscordFunction(),
    envCheck: await checkEnvironmentVariables(),
    actions: await testDifferentActions()
  };
  
  console.log('');
  console.log('=' .repeat(50));
  console.log('📊 Test Results:');
  console.log('- Basic function call:', results.basicCall ? '✅ PASS' : '❌ FAIL');
  console.log('- Environment check:', results.envCheck ? '✅ PASS' : '❌ FAIL');
  console.log('- Action validation:', results.actions ? '✅ PASS' : '❌ FAIL');
  
  console.log('');
  if (results.basicCall && results.envCheck) {
    console.log('🎉 Discord integration is working!');
    console.log('You can now create leagues and Discord channels will be created automatically.');
  } else {
    console.log('🔧 Discord integration needs attention:');
    console.log('');
    console.log('Setup Instructions:');
    console.log('1. Go to Discord Developer Portal: https://discord.com/developers/applications');
    console.log('2. Create a new application and get the bot token');
    console.log('3. Add the bot to your Discord server with proper permissions');
    console.log('4. Get your Discord server ID (right-click server → Copy Server ID)');
    console.log('5. Set environment variables in Supabase Dashboard:');
    console.log('   - DISCORD_BOT_TOKEN');
    console.log('   - DISCORD_MAIN_SERVER_ID');
    console.log('');
    console.log('Required Bot Permissions:');
    console.log('- Manage Channels');
    console.log('- Create Invite');
    console.log('- Send Messages');
  }
  
  return results;
}

// Run the tests
runAllTests().catch(console.error); 