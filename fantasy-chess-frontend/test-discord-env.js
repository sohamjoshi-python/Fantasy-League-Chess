#!/usr/bin/env node

/**
 * Discord Environment Variables Test
 * Tests what environment variables the function can access
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

// Test 1: Check environment variables
async function testEnvironmentVariables() {
  console.log('🔍 Test 1: Check environment variables...');
  
  const requestData = JSON.stringify({
    action: 'create_league_channel',
    leagueName: 'Test League',
    leagueId: 'test-league-env'
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
    
    // Parse the response to see the error details
    try {
      const errorData = JSON.parse(response.data);
      if (errorData.details) {
        console.log('\n🔍 Error details:', errorData.details);
      }
      if (errorData.suggestion) {
        console.log('💡 Suggestion:', errorData.suggestion);
      }
    } catch (e) {
      // Could not parse as JSON
    }
    
    return response;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

// Test 2: Check Discord API directly
async function testDiscordApi() {
  console.log('\n🔍 Test 2: Check Discord API directly...');
  
  if (!env.DISCORD_BOT_TOKEN) {
    console.log('❌ DISCORD_BOT_TOKEN not found in .env file');
    return;
  }
  
  if (!env.DISCORD_MAIN_SERVER_ID) {
    console.log('❌ DISCORD_MAIN_SERVER_ID not found in .env file');
    return;
  }
  
  console.log('✅ Found Discord credentials in .env file');
  console.log(`Bot Token: ${env.DISCORD_BOT_TOKEN.substring(0, 10)}...`);
  console.log(`Server ID: ${env.DISCORD_MAIN_SERVER_ID}`);
  
  // Test Discord API directly
  const options = {
    hostname: 'discord.com',
    port: 443,
    path: `/api/v10/guilds/${env.DISCORD_MAIN_SERVER_ID}`,
    method: 'GET',
    headers: {
      'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await makeRequest(options);
    console.log(`Discord API Status: ${response.statusCode}`);
    console.log(`Discord API Response: ${response.data}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Discord API is accessible!');
    } else {
      console.log('❌ Discord API returned error');
    }
  } catch (error) {
    console.log('❌ Discord API error:', error.message);
  }
}

// Test 3: Check Supabase environment variables
async function checkSupabaseEnv() {
  console.log('\n🔍 Test 3: Check what Supabase environment variables are set...');
  
  console.log('Local .env file contains:');
  console.log(`- SUPABASE_URL: ${env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- DISCORD_BOT_TOKEN: ${env.DISCORD_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`- DISCORD_MAIN_SERVER_ID: ${env.DISCORD_MAIN_SERVER_ID ? '✅ Set' : '❌ Missing'}`);
  
  console.log('\n💡 Note: The function uses Supabase Dashboard environment variables, not local .env file');
  console.log('Make sure these are set in Supabase Dashboard → Settings → Environment Variables:');
  console.log('- DISCORD_BOT_TOKEN');
  console.log('- DISCORD_MAIN_SERVER_ID');
}

// Main test runner
async function runEnvTests() {
  console.log('🔧 Discord Environment Variables Test');
  console.log('=' .repeat(50));
  console.log('');
  
  await testEnvironmentVariables();
  await testDiscordApi();
  await checkSupabaseEnv();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🔧 Troubleshooting:');
  console.log('1. Check Supabase Dashboard → Settings → Environment Variables');
  console.log('2. Make sure DISCORD_BOT_TOKEN and DISCORD_MAIN_SERVER_ID are set');
  console.log('3. Verify the bot token is valid and the server ID is correct');
  console.log('4. Check if the bot is added to the server with proper permissions');
  console.log('5. Look at Supabase Dashboard → Edge Functions → discord-bot → Logs');
}

runEnvTests().catch(console.error); 