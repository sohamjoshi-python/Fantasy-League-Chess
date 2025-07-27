#!/usr/bin/env node

/**
 * Discord Credentials Test
 * Tests the Discord bot token and server ID directly
 */

import https from 'https';

// Test Discord bot token and server ID
async function testDiscordCredentials() {
  console.log('🔍 Testing Discord Credentials...');
  
  // These are the values from your Supabase environment variables
  const botToken = 'MTM5ODc5MDUyMTY4NTY3MjAzNg.GvVRC_.WPOTtdnqpEBcezU6dB9TWrooDloKw3ew1u4xNM';
  const serverId = '1398790718000205876'; // This is the server ID from the logs
  
  console.log(`Server ID from logs: ${serverId}`);
  console.log(`Bot Token: ${botToken.substring(0, 10)}...`);
  
  // Test 1: Check if bot token is valid
  console.log('\n🧪 Test 1: Check bot token...');
  
  const botOptions = {
    hostname: 'discord.com',
    port: 443,
    path: '/api/v10/users/@me',
    method: 'GET',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const botResponse = await new Promise((resolve, reject) => {
      const req = https.request(botOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data });
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    console.log(`Bot API Status: ${botResponse.statusCode}`);
    console.log(`Bot API Response: ${botResponse.data}`);
    
    if (botResponse.statusCode === 200) {
      console.log('✅ Bot token is valid!');
    } else {
      console.log('❌ Bot token is invalid');
      return;
    }
  } catch (error) {
    console.log('❌ Bot API error:', error.message);
    return;
  }
  
  // Test 2: Check if bot is in the server
  console.log('\n🧪 Test 2: Check if bot is in server...');
  
  const serverOptions = {
    hostname: 'discord.com',
    port: 443,
    path: `/api/v10/guilds/${serverId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const serverResponse = await new Promise((resolve, reject) => {
      const req = https.request(serverOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data });
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    console.log(`Server API Status: ${serverResponse.statusCode}`);
    console.log(`Server API Response: ${serverResponse.data}`);
    
    if (serverResponse.statusCode === 200) {
      console.log('✅ Bot is in the server!');
    } else if (serverResponse.statusCode === 404) {
      console.log('❌ Server not found or bot not in server');
    } else {
      console.log('❌ Server API error');
    }
  } catch (error) {
    console.log('❌ Server API error:', error.message);
  }
  
  // Test 3: Check bot permissions in server
  console.log('\n🧪 Test 3: Check bot permissions...');
  
  const permissionsOptions = {
    hostname: 'discord.com',
    port: 443,
    path: `/api/v10/guilds/${serverId}/members/@me`,
    method: 'GET',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const permissionsResponse = await new Promise((resolve, reject) => {
      const req = https.request(permissionsOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data });
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    console.log(`Permissions API Status: ${permissionsResponse.statusCode}`);
    console.log(`Permissions API Response: ${permissionsResponse.data}`);
    
    if (permissionsResponse.statusCode === 200) {
      console.log('✅ Bot permissions check successful!');
    } else {
      console.log('❌ Bot permissions check failed');
    }
  } catch (error) {
    console.log('❌ Permissions API error:', error.message);
  }
}

// Instructions
console.log('🔧 Discord Credentials Test');
console.log('=' .repeat(50));
console.log('');
console.log('To run this test:');
console.log('1. Get your Discord bot token from Discord Developer Portal');
console.log('2. Replace "YOUR_BOT_TOKEN_HERE" with your actual bot token');
console.log('3. Run: node test-discord-credentials.js');
console.log('');
console.log('This will test:');
console.log('- If your bot token is valid');
console.log('- If your bot is in the server');
console.log('- If your bot has proper permissions');
console.log('');

// Run the test
testDiscordCredentials().catch(console.error); 