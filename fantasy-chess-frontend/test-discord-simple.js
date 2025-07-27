#!/usr/bin/env node

/**
 * Simple Discord Function Test
 * Tests basic JSON parsing and function accessibility
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

// Test 1: Empty JSON
async function testEmptyJson() {
  console.log('🧪 Test 1: Empty JSON object...');
  
  const requestData = JSON.stringify({});
  
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
    return response;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

// Test 2: Invalid action
async function testInvalidAction() {
  console.log('🧪 Test 2: Invalid action...');
  
  const requestData = JSON.stringify({
    action: 'invalid_action_that_does_not_exist'
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
    return response;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

// Test 3: Missing parameters
async function testMissingParameters() {
  console.log('🧪 Test 3: Missing parameters...');
  
  const requestData = JSON.stringify({
    action: 'create_league_channel'
    // Missing leagueName and leagueId
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
    return response;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

// Test 4: Correct format
async function testCorrectFormat() {
  console.log('🧪 Test 4: Correct format...');
  
  const requestData = JSON.stringify({
    action: 'create_league_channel',
    leagueName: 'Test League',
    leagueId: 'test-league-id'
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
    return response;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🔬 Discord Function Simple Tests');
  console.log('=' .repeat(50));
  console.log('');
  
  const results = [];
  
  results.push(await testEmptyJson());
  console.log('');
  
  results.push(await testInvalidAction());
  console.log('');
  
  results.push(await testMissingParameters());
  console.log('');
  
  results.push(await testCorrectFormat());
  console.log('');
  
  console.log('=' .repeat(50));
  console.log('📊 Analysis:');
  
  const emptyJson = results[0];
  const invalidAction = results[1];
  const missingParams = results[2];
  const correctFormat = results[3];
  
  if (emptyJson && emptyJson.statusCode === 400 && emptyJson.data.includes('Invalid action')) {
    console.log('✅ Function can parse JSON and handle empty objects');
  } else {
    console.log('❌ Function has issues with JSON parsing');
  }
  
  if (invalidAction && invalidAction.statusCode === 400 && invalidAction.data.includes('Invalid action')) {
    console.log('✅ Function correctly rejects invalid actions');
  } else {
    console.log('❌ Function not handling invalid actions correctly');
  }
  
  if (missingParams && missingParams.statusCode === 400 && missingParams.data.includes('Missing')) {
    console.log('✅ Function correctly validates required parameters');
  } else {
    console.log('❌ Function not validating parameters correctly');
  }
  
  if (correctFormat && correctFormat.statusCode === 200) {
    console.log('✅ Function works with correct format!');
  } else if (correctFormat && correctFormat.statusCode === 500) {
    console.log('⚠️ Function accepts correct format but has internal errors (likely Discord API issues)');
  } else {
    console.log('❌ Function not accepting correct format');
  }
}

runTests().catch(console.error); 