#!/usr/bin/env node

/**
 * Discord Bot Permissions Test
 * Checks the bot's actual permissions in the server
 */

import https from 'https';

// Discord permission flags
const PERMISSIONS = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  PRIORITY_SPEAKER: 1n << 8n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  VIEW_GUILD_INSIGHTS: 1n << 19n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_EMOJIS_AND_STICKERS: 1n << 30n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  REQUEST_TO_SPEAK: 1n << 32n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  USE_EMBEDDED_ACTIVITIES: 1n << 39n,
  MODERATE_MEMBERS: 1n << 40n
};

// Function to decode permissions
function decodePermissions(permissionBits) {
  const permissions = BigInt(permissionBits);
  const grantedPermissions = [];
  
  for (const [permissionName, permissionBit] of Object.entries(PERMISSIONS)) {
    if ((permissions & permissionBit) === permissionBit) {
      grantedPermissions.push(permissionName);
    }
  }
  
  return grantedPermissions;
}

// Test bot permissions
async function testBotPermissions() {
  console.log('🔍 Testing Bot Permissions...');
  
  const botToken = 'MTM5ODc5MDUyMTY4NTY3MjAzNg.GvVRC_.WPOTtdnqpEBcezU6dB9TWrooDloKw3ew1u4xNM';
  const serverId = '1398790718000205876';
  const botId = '1398790521685672036';
  
  console.log(`Bot ID: ${botId}`);
  console.log(`Server ID: ${serverId}`);
  
  // Get server information to check bot's role permissions
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
    
    if (serverResponse.statusCode === 200) {
      const serverData = JSON.parse(serverResponse.data);
      console.log(`\n✅ Server: ${serverData.name}`);
      
      // Find the bot's role
      const botRole = serverData.roles.find(role => role.tags && role.tags.bot_id === botId);
      
      if (botRole) {
        console.log(`\n🤖 Bot Role: ${botRole.name}`);
        console.log(`Role ID: ${botRole.id}`);
        console.log(`Permissions: ${botRole.permissions}`);
        
        const permissions = decodePermissions(botRole.permissions);
        console.log(`\n📋 Bot Permissions:`);
        permissions.forEach(perm => console.log(`  ✅ ${perm}`));
        
        // Check for required permissions
        const requiredPermissions = ['MANAGE_CHANNELS', 'CREATE_INSTANT_INVITE', 'SEND_MESSAGES'];
        const missingPermissions = requiredPermissions.filter(perm => !permissions.includes(perm));
        
        if (missingPermissions.length > 0) {
          console.log(`\n❌ Missing Required Permissions:`);
          missingPermissions.forEach(perm => console.log(`  ❌ ${perm}`));
          console.log(`\n💡 Solution: Give the bot these permissions in Discord server settings`);
        } else {
          console.log(`\n✅ All required permissions are granted!`);
        }
        
        // Check if bot has administrator
        if (permissions.includes('ADMINISTRATOR')) {
          console.log(`\n🔧 Bot has Administrator permission (can do everything)`);
        }
        
      } else {
        console.log('❌ Could not find bot role in server');
      }
      
    } else {
      console.log(`❌ Failed to get server info: ${serverResponse.statusCode}`);
      console.log(`Response: ${serverResponse.data}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Test creating a channel directly
async function testCreateChannel() {
  console.log('\n🧪 Testing Channel Creation...');
  
  const botToken = 'MTM5ODc5MDUyMTY4NTY3MjAzNg.GvVRC_.WPOTtdnqpEBcezU6dB9TWrooDloKw3ew1u4xNM';
  const serverId = '1398790718000205876';
  
  const channelData = {
    name: 'test-channel-' + Date.now(),
    type: 0, // Text channel
    topic: 'Test channel created by bot',
    parent_id: null
  };
  
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
    } else {
      console.log('❌ Channel creation failed');
    }
    
  } catch (error) {
    console.log('❌ Error creating channel:', error.message);
  }
}

// Main test runner
async function runPermissionTests() {
  console.log('🔧 Discord Bot Permissions Test');
  console.log('=' .repeat(50));
  
  await testBotPermissions();
  await testCreateChannel();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📋 Summary:');
  console.log('This test shows:');
  console.log('1. What permissions the bot currently has');
  console.log('2. Whether the bot can create channels');
  console.log('3. What permissions might be missing');
}

runPermissionTests().catch(console.error); 