const https = require('https');

// Simple test to verify private channel creation
async function testPrivateChannel() {
  const DISCORD_BOT_TOKEN = 'MTM5ODc5MDUyMTY4NTY3MjAzNg.GvVRC_.WPOTtdnqpEBcezU6dB9TWrooDloKw3ew1u4xNM';
  const DISCORD_MAIN_SERVER_ID = '1195123456789012345'; // Replace with your actual server ID

  console.log('🔍 Testing Private Channel Creation');
  console.log('='.repeat(50));

  // The correct way to create a private channel
  const channelData = {
    name: 'test-private-league',
    type: 0, // text channel
    topic: 'Test private league channel',
    parent_id: null,
    permission_overwrites: [
      {
        id: DISCORD_MAIN_SERVER_ID, // @everyone role
        type: 0, // role type
        allow: "0", // no permissions
        deny: "1024" // deny VIEW_CHANNEL permission
      }
    ]
  };

  console.log('📤 Channel data:', JSON.stringify(channelData, null, 2));

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      port: 443,
      path: `/api/v10/guilds/${DISCORD_MAIN_SERVER_ID}/channels`,
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 201) {
            const channel = JSON.parse(data);
            console.log('✅ Channel created successfully!');
            console.log('📋 Channel details:');
            console.log(`   Name: ${channel.name}`);
            console.log(`   ID: ${channel.id}`);
            console.log(`   Parent ID: ${channel.parent_id || 'None'}`);
            console.log(`   Position: ${channel.position}`);
            
            if (channel.permission_overwrites && channel.permission_overwrites.length > 0) {
              console.log('🔐 Permission overwrites:');
              channel.permission_overwrites.forEach(perm => {
                console.log(`   - ${perm.type === 0 ? 'Role' : 'User'}: ${perm.id}`);
                console.log(`     Allow: ${perm.allow}`);
                console.log(`     Deny: ${perm.deny}`);
              });
            }
            
            console.log('\n🔒 This channel should be private (invite-only)');
            console.log('🔗 Only people with invite links can join');
            
            // Clean up
            deleteChannel(channel.id);
            
            resolve(channel);
          } else {
            console.log('❌ Failed to create channel:', res.statusCode);
            console.log('Response:', data);
            resolve(null);
          }
        } catch (error) {
          console.error('❌ Error:', error);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.write(JSON.stringify(channelData));
    req.end();
  });
}

async function deleteChannel(channelId) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'discord.com',
      port: 443,
      path: `/api/v10/channels/${channelId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 204) {
        console.log('🗑️  Test channel deleted');
      }
      resolve();
    });

    req.on('error', (error) => {
      console.error('❌ Error deleting channel:', error);
      resolve();
    });

    req.end();
  });
}

// Instructions
console.log('📝 Before running this test:');
console.log('   1. Update DISCORD_MAIN_SERVER_ID with your actual server ID');
console.log('   2. Make sure your bot has MANAGE_CHANNELS permission');
console.log('\n🔧 This test will:');
console.log('   1. Create a private channel using permission_overwrites');
console.log('   2. Show you the channel details');
console.log('   3. Delete the test channel');
console.log('\n' + '='.repeat(50));

// Uncomment to run the test
// testPrivateChannel().catch(console.error);

console.log('\n💡 To run the test, uncomment the last line and run:');
console.log('   node test-private-channel-simple.js'); 