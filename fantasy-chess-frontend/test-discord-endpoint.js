#!/usr/bin/env node

/**
 * Discord API Endpoint Test
 * Tests the exact Discord API endpoint that the function should use
 */

import https from 'https';

async function testDiscordEndpoint() {
  console.log('🔍 Testing Discord API Endpoint...');
  
  const botToken = 'MTM5ODc5MDUyMTY4NTY3MjAzNg.GvVRC_.WPOTtdnqpEBcezU6dB9TWrooDloKw3ew1u4xNM';
  const serverId = '1398790718000205876';
  
  console.log(`Server ID: ${serverId}`);
  console.log(`Bot Token: ${botToken.substring(0, 10)}...`);
  
  // Test 1: Check if we can access the server (this should work)
  console.log('\n🧪 Test 1: Check server access...');
  
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
    if (serverResponse.statusCode === 200) {
      console.log('✅ Server access successful!');
    } else {
      console.log(`❌ Server access failed: ${serverResponse.data}`);
      return;
    }
  } catch (error) {
    console.log('❌ Server API error:', error.message);
    return;
  }
  
  // Test 2: Try to create a channel (this is what the function does)
  console.log('\n🧪 Test 2: Try to create a channel...');
  
  const channelData = {
    name: `test-channel-${Date.now()}`,
    type: 0, // Text channel
    topic: 'Test channel created by bot',
    parent_id: null
  };
  
  console.log('Channel data:', JSON.stringify(channelData, null, 2));
  
  const createOptions = {
    hostname: 'discord.com',
    port: 443,
    path: `/api/v10/guilds/${serverId}/channels`,
    method: 'POST',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(channelData))
    }
  };
  
  try {
    const createResponse = await new Promise((resolve, reject) => {
      const req = https.request(createOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data });
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(channelData));
      req.end();
    });
    
    console.log(`Create Channel Status: ${createResponse.statusCode}`);
    console.log(`Create Channel Response: ${createResponse.data}`);
    
    if (createResponse.statusCode === 201) {
      console.log('✅ Channel creation successful!');
      const channelInfo = JSON.parse(createResponse.data);
      console.log(`Channel ID: ${channelInfo.id}`);
      console.log(`Channel Name: ${channelInfo.name}`);
      
      // Test 3: Try to delete the test channel
      console.log('\n🧪 Test 3: Clean up - delete test channel...');
      
      const deleteOptions = {
        hostname: 'discord.com',
        port: 443,
        path: `/api/v10/channels/${channelInfo.id}`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      try {
        const deleteResponse = await new Promise((resolve, reject) => {
          const req = https.request(deleteOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              resolve({ statusCode: res.statusCode, data });
            });
          });
          req.on('error', reject);
          req.end();
        });
        
        console.log(`Delete Channel Status: ${deleteResponse.statusCode}`);
        if (deleteResponse.statusCode === 204) {
          console.log('✅ Test channel deleted successfully!');
        } else {
          console.log(`❌ Failed to delete test channel: ${deleteResponse.data}`);
        }
      } catch (error) {
        console.log('❌ Error deleting test channel:', error.message);
      }
      
    } else {
      console.log('❌ Channel creation failed');
    }
    
  } catch (error) {
    console.log('❌ Error creating channel:', error.message);
  }
}

// Run the test
testDiscordEndpoint().catch(console.error); 