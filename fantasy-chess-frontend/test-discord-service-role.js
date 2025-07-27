#!/usr/bin/env node

/**
 * Discord Integration Test - Service Role Version
 * Run with: node test-discord-service-role.js
 * 
 * This version uses the service role key for proper authentication
 */

import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return env;
  } catch (error) {
    console.log('⚠️ Could not load .env file, using fallback values');
    return {};
  }
}

const env = loadEnv();

// Configuration - Uses environment variables from .env
const config = {
  supabaseUrl: env.SUPABASE_URL || 'wdbwzvnkfbyzazodfhsw.supabase.co',
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  testLeagueName: 'Test League Service Role',
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

// Test 1: Basic Discord function call with service role
async function testDiscordFunction() {
  console.log('📡 Testing Discord function call with service role...');
  
  if (!config.serviceRoleKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env file');
    console.log('Please add it to your .env file: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    console.log('Get it from: Supabase Dashboard → Settings → API → service_role key');
    return false;
  }
  
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
      'Authorization': `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData)
    }
  };
  
  try {
    const response = await makeRequest(options, requestData);
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`Request data: ${requestData}`);
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

// Test 2: Check if function is accessible
async function checkFunctionAccess() {
  console.log('🔍 Checking function access...');
  
  const options = {
    hostname: config.supabaseUrl,
    port: 443,
    path: '/functions/v1/discord-bot',
    method: 'OPTIONS'
  };
  
  try {
    const response = await makeRequest(options);
    console.log(`Function accessible: ${response.statusCode === 200 ? '✅ YES' : '❌ NO'}`);
    return response.statusCode === 200;
  } catch (error) {
    console.log('❌ Function not accessible:', error.message);
    return false;
  }
}

// Test 3: Test with different authentication methods
async function testAuthenticationMethods() {
  console.log('🔐 Testing different authentication methods...');
  
  const methods = [
    { name: 'Service Role', key: config.serviceRoleKey },
    { name: 'Anon Key', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NzU2MzIsImV4cCI6MjA2OTE1MTYzMn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8' }
  ];
  
  for (const method of methods) {
    if (!method.key) {
      console.log(`  ${method.name}: ⚠️ Not configured`);
      continue;
    }
    
    console.log(`  Testing ${method.name}...`);
    
    const requestData = JSON.stringify({
      action: 'create_league_channel',
      leagueName: `Test ${method.name}`,
      leagueId: `test-${method.name.toLowerCase().replace(' ', '-')}`
    });
    
    const options = {
      hostname: config.supabaseUrl,
      port: 443,
      path: '/functions/v1/discord-bot',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${method.key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    try {
      const response = await makeRequest(options, requestData);
      console.log(`    Status: ${response.statusCode}`);
      console.log(`    Request: ${requestData}`);
      console.log(`    Response: ${response.data}`);
      
      if (response.statusCode === 200) {
        console.log(`    ✅ ${method.name} works!`);
      } else {
        console.log(`    ❌ ${method.name} failed`);
      }
    } catch (error) {
      console.log(`    ❌ ${method.name} error: ${error.message}`);
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Discord Integration Test - Service Role Version');
  console.log('=' .repeat(60));
  console.log(`Test League: ${config.testLeagueName}`);
  console.log(`Test ID: ${config.testLeagueId}`);
  console.log('');
  
  const results = {
    functionAccess: await checkFunctionAccess(),
    serviceRole: await testDiscordFunction(),
    authMethods: await testAuthenticationMethods()
  };
  
  console.log('');
  console.log('=' .repeat(60));
  console.log('📊 Test Results:');
  console.log('- Function accessible:', results.functionAccess ? '✅ PASS' : '❌ FAIL');
  console.log('- Service role auth:', results.serviceRole ? '✅ PASS' : '❌ FAIL');
  console.log('- Auth methods tested:', results.authMethods ? '✅ PASS' : '❌ FAIL');
  
  console.log('');
  if (results.serviceRole) {
    console.log('🎉 Discord integration is working with service role!');
    console.log('The function is properly configured and accessible.');
  } else {
    console.log('🔧 Discord integration needs attention:');
    console.log('');
    console.log('Next steps:');
    console.log('1. Get your service role key from Supabase Dashboard');
    console.log('2. Update the config.serviceRoleKey in this script');
    console.log('3. Check function permissions in Supabase Dashboard');
    console.log('4. Verify Discord environment variables are set');
  }
  
  return results;
}

// Run the tests
runAllTests().catch(console.error); 