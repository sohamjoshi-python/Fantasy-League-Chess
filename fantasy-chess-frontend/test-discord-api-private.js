const https = require('https');

// Test different Discord API parameters for creating private channels
async function testDiscordPrivateChannelCreation() {
  const DISCORD_BOT_TOKEN = 'MTM5ODc5MDUyMTY4NTY3MjAzNg.GvVRC_.WPOTtdnqpEBcezU6dB9TWrooDloKw3ew1u4xNM';
  const DISCORD_MAIN_SERVER_ID = '1195123456789012345'; // Replace with your actual server ID

  console.log('🔍 Testing Discord Private Channel Creation Methods');
  console.log('='.repeat(60));

  // Method 1: Using 'private' property
  console.log('\n1️⃣ Testing with "private: true"');
  await testChannelCreation({
    name: 'test-private-1',
    type: 0,
    topic: 'Test private channel method 1',
    private: true
  });

  // Method 2: Using 'permission_overwrites' to deny @everyone
  console.log('\n2️⃣ Testing with permission_overwrites (deny @everyone)');
  await testChannelCreation({
    name: 'test-private-2',
    type: 0,
    topic: 'Test private channel method 2',
    permission_overwrites: [
      {
        id: DISCORD_MAIN_SERVER_ID, // @everyone role
        type: 0, // role
        allow: "0",
        deny: "1024" // VIEW_CHANNEL permission
      }
    ]
  });

  // Method 3: Using 'parent_id' to make it a private channel
  console.log('\n3️⃣ Testing with parent_id (category-based private)');
  await testChannelCreation({
    name: 'test-private-3',
    type: 0,
    topic: 'Test private channel method 3',
    parent_id: null // This should make it a top-level private channel
  });

  // Method 4: Using 'nsfw' property (not really private, but different)
  console.log('\n4️⃣ Testing with nsfw property');
  await testChannelCreation({
    name: 'test-private-4',
    type: 0,
    topic: 'Test private channel method 4',
    nsfw: false
  });
}

async function testChannelCreation(channelData) {
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
            console.log(`   ✅ Channel created: ${channel.name}`);
            console.log(`   📋 Channel ID: ${channel.id}`);
            console.log(`   🔒 Parent ID: ${channel.parent_id || 'None'}`);
            console.log(`   📍 Position: ${channel.position}`);
            
            // Check if it's actually private
            const isPrivate = !channel.parent_id;
            console.log(`   🔐 Is Private: ${isPrivate ? 'YES' : 'NO'}`);
            
            // Clean up - delete the test channel
            deleteTestChannel(channel.id);
            
            resolve(channel);
          } else {
            console.log(`   ❌ Failed to create channel: ${res.statusCode}`);
            console.log(`   📄 Response: ${data}`);
            resolve(null);
          }
        } catch (error) {
          console.error('   ❌ Error parsing response:', error);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('   ❌ Request error:', error);
      resolve(null);
    });

    req.write(JSON.stringify(channelData));
    req.end();
  });
}

async function deleteTestChannel(channelId) {
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
        console.log(`   🗑️  Test channel deleted: ${channelId}`);
      } else {
        console.log(`   ⚠️  Could not delete test channel: ${res.statusCode}`);
      }
      resolve();
    });

    req.on('error', (error) => {
      console.error('   ❌ Error deleting channel:', error);
      resolve();
    });

    req.end();
  });
}

// Research Discord API documentation
console.log('📚 Discord API Research for Private Channels');
console.log('='.repeat(60));
console.log('According to Discord API documentation:');
console.log('');
console.log('🔍 Channel Creation Parameters:');
console.log('   • name: string (required)');
console.log('   • type: integer (0=text, 2=voice, 4=category)');
console.log('   • topic: string (optional)');
console.log('   • parent_id: snowflake (optional) - category ID');
console.log('   • permission_overwrites: array (optional)');
console.log('   • nsfw: boolean (optional)');
console.log('');
console.log('🔒 Making Channels Private:');
console.log('   • Channels are private by default if parent_id is null');
console.log('   • Use permission_overwrites to control access');
console.log('   • @everyone role with VIEW_CHANNEL denied = private');
console.log('   • No "private" property exists in Discord API');
console.log('');

// Run the tests
testDiscordPrivateChannelCreation().catch(console.error); 