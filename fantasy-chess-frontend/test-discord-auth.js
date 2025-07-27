#!/usr/bin/env node

/**
 * Discord Function Authentication Test
 * Tests the function with proper authorization headers
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

// Test with different authorization methods
async function testAuthorizationMethods() {
  console.log('🔐 Testing different authorization methods...');
  
  const requestData = JSON.stringify({
    action: 'create_league_channel',
    leagueName: 'Test League Auth',
    leagueId: 'test-league-auth'
  });
  
  const authMethods = [
    {
      name: 'Bearer Token (Service Role)',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    },
    {
      name: 'apikey Header (Service Role)',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    },
    {
      name: 'Both Bearer and apikey',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    },
    {
      name: 'x-client-info Header',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'x-client-info': 'supabase-js/2.0.0',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    }
  ];
  
  for (const method of authMethods) {
    console.log(`\n🧪 Testing: ${method.name}`);
    
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('  ❌ No service role key found in .env');
      continue;
    }
    
    const options = {
      hostname: 'wdbwzvnkfbyzazodfhsw.supabase.co',
      port: 443,
      path: '/functions/v1/discord-bot',
      method: 'POST',
      headers: method.headers
    };
    
    try {
      const response = await makeRequest(options, requestData);
      console.log(`  Status: ${response.statusCode}`);
      console.log(`  Response: ${response.data}`);
      
      if (response.statusCode === 200) {
        console.log(`  ✅ ${method.name} works!`);
      } else if (response.statusCode === 400) {
        console.log(`  ⚠️ ${method.name} - Function responding but with validation error`);
      } else if (response.statusCode === 401) {
        console.log(`  ❌ ${method.name} - Still unauthorized`);
      } else {
        console.log(`  ❓ ${method.name} - Unexpected status`);
      }
    } catch (error) {
      console.log(`  ❌ ${method.name} - Error: ${error.message}`);
    }
  }
}

// Test function configuration
async function checkFunctionConfig() {
  console.log('\n🔧 Checking function configuration...');
  
  console.log('Current environment variables:');
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- DISCORD_BOT_TOKEN: ${env.DISCORD_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`- DISCORD_MAIN_SERVER_ID: ${env.DISCORD_MAIN_SERVER_ID ? '✅ Set' : '❌ Missing'}`);
  
  console.log('\n💡 Function Configuration Issues:');
  console.log('1. The function is requiring authentication (401 errors)');
  console.log('2. This means JWT verification is enabled');
  console.log('3. We need to either:');
  console.log('   a) Disable JWT verification in Supabase Dashboard');
  console.log('   b) Use proper authentication headers');
  console.log('   c) Deploy the function with different settings');
  
  console.log('\n🔧 To fix this:');
  console.log('1. Go to Supabase Dashboard → Edge Functions → discord-bot');
  console.log('2. Click "Settings"');
  console.log('3. Disable "JWT verification" temporarily for testing');
  console.log('4. Redeploy the function');
}

// Main test runner
async function runAuthTests() {
  console.log('🔐 Discord Function Authentication Tests');
  console.log('=' .repeat(60));
  
  await testAuthorizationMethods();
  await checkFunctionConfig();
  
  console.log('\n' + '=' .repeat(60));
  console.log('📋 Summary:');
  console.log('- Function is deployed and accessible');
  console.log('- Function requires authentication (JWT verification enabled)');
  console.log('- Need to configure authentication properly');
  console.log('- Check Supabase Dashboard for function settings');
}

runAuthTests().catch(console.error); 