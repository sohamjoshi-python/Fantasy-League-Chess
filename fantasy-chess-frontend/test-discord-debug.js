#!/usr/bin/env node

/**
 * Discord Function Debug Test
 * Tests to see exactly what the function is receiving
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
    console.log('⚠️ Could not load .env file');
    return {};
  }
}

const env = loadEnv();

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

// Test 1: Send raw JSON string
async function testRawJson() {
  console.log('🧪 Test 1: Raw JSON string...');
  
  const rawJson = '{"action":"create_league_channel","leagueName":"test","leagueId":"test"}';
  
  const options = {
    hostname: 'wdbwzvnkfbyzazodfhsw.supabase.co',
    port: 443,
    path: '/functions/v1/discord-bot',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(rawJson)
    }
  };
  
  try {
    const response = await makeRequest(options, rawJson);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.data}`);
    return response;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

// Test 2: Send with different JSON structure
async function testDifferentJson() {
  console.log('🧪 Test 2: Different JSON structure...');
  
  const testCases = [
    {
      name: 'Simple action only',
      data: { action: 'create_league_channel' }
    },
    {
      name: 'Action with extra fields',
      data: { 
        action: 'create_league_channel',
        leagueName: 'test',
        leagueId: 'test',
        extraField: 'should be ignored'
      }
    },
    {
      name: 'Action with null values',
      data: { 
        action: 'create_league_channel',
        leagueName: null,
        leagueId: null
      }
    },
    {
      name: 'Action with empty strings',
      data: { 
        action: 'create_league_channel',
        leagueName: '',
        leagueId: ''
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n  Testing: ${testCase.name}`);
    
    const requestData = JSON.stringify(testCase.data);
    
    const options = {
      hostname: 'wdbwzvnkfbyzazodfhsw.supabase.co',
      port: 443,
      path: '/functions/v1/discord-bot',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    try {
      const response = await makeRequest(options, requestData);
      console.log(`    Status: ${response.statusCode}`);
      console.log(`    Response: ${response.data}`);
    } catch (error) {
      console.log(`    Error: ${error.message}`);
    }
  }
}

// Test 3: Check if function is deployed correctly
async function checkFunctionDeployment() {
  console.log('🧪 Test 3: Check function deployment...');
  
  // Try to access a non-existent function to see if it's a routing issue
  const options = {
    hostname: 'wdbwzvnkfbyzazodfhsw.supabase.co',
    port: 443,
    path: '/functions/v1/non-existent-function',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': '2'
    }
  };
  
  try {
    const response = await makeRequest(options, '{}');
    console.log(`Non-existent function status: ${response.statusCode}`);
    console.log(`Non-existent function response: ${response.data}`);
  } catch (error) {
    console.log(`Non-existent function error: ${error.message}`);
  }
}

// Test 4: Check function logs
async function checkFunctionLogs() {
  console.log('🧪 Test 4: Trigger function to generate logs...');
  
  const requestData = JSON.stringify({
    action: 'create_league_channel',
    leagueName: 'Debug Test League',
    leagueId: 'debug-test-' + Date.now()
  });
  
  const options = {
    hostname: 'wdbwzvnkfbyzazodfhsw.supabase.co',
    port: 443,
    path: '/functions/v1/discord-bot',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData)
    }
  };
  
  try {
    const response = await makeRequest(options, requestData);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.data}`);
    
    console.log('\n💡 Check Supabase Dashboard → Edge Functions → discord-bot → Logs');
    console.log('Look for the log entry with this request to see what the function received');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Main test runner
async function runDebugTests() {
  console.log('🔍 Discord Function Debug Tests');
  console.log('=' .repeat(50));
  console.log('');
  
  await testRawJson();
  console.log('');
  
  await testDifferentJson();
  console.log('');
  
  await checkFunctionDeployment();
  console.log('');
  
  await checkFunctionLogs();
  console.log('');
  
  console.log('=' .repeat(50));
  console.log('🔧 Debugging Steps:');
  console.log('1. Check Supabase Dashboard → Edge Functions → discord-bot → Logs');
  console.log('2. Look for the console.log output from the function');
  console.log('3. See if the function is receiving the JSON correctly');
  console.log('4. Check if there are any JavaScript errors in the function');
  console.log('');
  console.log('💡 Most likely issues:');
  console.log('- Function not properly deployed');
  console.log('- JavaScript error in the function code');
  console.log('- Environment variables not set');
  console.log('- Function timeout or memory issues');
}

runDebugTests().catch(console.error); 