const https = require('https');

// Your Discord bot token
const DISCORD_BOT_TOKEN = 'MTM5ODc5MDUyMTY4NTY3MjAzNg.GvVRC_.WPOTtdnqpEBcezU6dB9TWrooDloKw3ew1u4xNM';
const DISCORD_MAIN_SERVER_ID = '1195123456789012345'; // Replace with your actual server ID

async function checkChannelPrivacy(channelId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      port: 443,
      path: `/api/v10/channels/${channelId}`,
      method: 'GET',
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
          const channel = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('✅ Channel found!');
            console.log('📋 Channel Details:');
            console.log(`   Name: ${channel.name}`);
            console.log(`   Type: ${channel.type} (0=text, 2=voice, 4=category)`);
            console.log(`   Position: ${channel.position}`);
            console.log(`   Parent ID: ${channel.parent_id || 'None'}`);
            
            // Check if it's a private channel
            const isPrivate = channel.type === 0 && !channel.parent_id;
            console.log(`\n🔒 Privacy Status:`);
            console.log(`   Is Private: ${isPrivate ? 'YES' : 'NO'}`);
            
            if (isPrivate) {
              console.log('   ✅ This channel is private (invite-only)');
            } else {
              console.log('   ❌ This channel is public (accessible to all server members)');
            }
            
            // Check permissions
            if (channel.permission_overwrites) {
              console.log(`\n🔐 Permission Overwrites:`);
              channel.permission_overwrites.forEach(perm => {
                console.log(`   - ${perm.type}: ${perm.id}`);
                console.log(`     Allow: ${perm.allow}`);
                console.log(`     Deny: ${perm.deny}`);
              });
            }
            
            resolve(channel);
          } else {
            console.error('❌ Error fetching channel:', data);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.end();
  });
}

async function listAllChannels() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      port: 443,
      path: `/api/v10/guilds/${DISCORD_MAIN_SERVER_ID}/channels`,
      method: 'GET',
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
          const channels = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('📋 All Channels in Server:');
            console.log('='.repeat(50));
            
            channels.forEach(channel => {
              if (channel.type === 0) { // Text channels only
                const isPrivate = !channel.parent_id;
                console.log(`\n🏆 ${channel.name}`);
                console.log(`   ID: ${channel.id}`);
                console.log(`   Private: ${isPrivate ? 'YES' : 'NO'}`);
                console.log(`   Position: ${channel.position}`);
              }
            });
            
            resolve(channels);
          } else {
            console.error('❌ Error fetching channels:', data);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.end();
  });
}

// Test functions
async function runTests() {
  try {
    console.log('🔍 Checking Discord Channel Privacy\n');
    
    // First, list all channels to see what we have
    console.log('1️⃣ Listing all channels...');
    await listAllChannels();
    
    console.log('\n' + '='.repeat(50));
    
    // You can test a specific channel ID here
    // Replace with an actual channel ID from your server
    const testChannelId = '1195123456789012345'; // Replace with actual channel ID
    
    console.log(`\n2️⃣ Checking specific channel: ${testChannelId}`);
    await checkChannelPrivacy(testChannelId);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
runTests(); 