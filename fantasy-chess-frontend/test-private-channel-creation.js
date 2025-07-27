const https = require('https');

// Test the Discord bot function to create a private channel
async function testPrivateChannelCreation() {
  const SUPABASE_URL = 'https://your-project-ref.supabase.co'; // Replace with your actual Supabase URL
  const SUPABASE_ANON_KEY = 'your-anon-key'; // Replace with your actual anon key
  
  const testData = {
    action: 'create_league_channel',
    leagueName: 'Test Private League',
    leagueId: 'test-league-id-' + Date.now()
  };

  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL.replace('https://', ''),
      port: 443,
      path: '/functions/v1/discord-bot',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          console.log('🔍 Testing Private Channel Creation');
          console.log('='.repeat(50));
          console.log('📤 Request Data:', JSON.stringify(testData, null, 2));
          console.log('📥 Response Status:', res.statusCode);
          console.log('📥 Response Data:', JSON.stringify(response, null, 2));
          
          if (res.statusCode === 200 && response.success) {
            console.log('\n✅ SUCCESS: Private channel created!');
            console.log(`   Channel ID: ${response.channelId}`);
            console.log(`   Invite URL: ${response.inviteUrl}`);
            
            // Now let's verify the channel is actually private
            console.log('\n🔍 Verifying channel privacy...');
            verifyChannelPrivacy(response.channelId);
          } else {
            console.log('\n❌ FAILED: Could not create private channel');
            console.log('   Error:', response.error);
            console.log('   Details:', response.details);
          }
          
          resolve(response);
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

    req.write(JSON.stringify(testData));
    req.end();
  });
}

// Verify that the created channel is actually private
async function verifyChannelPrivacy(channelId) {
  const DISCORD_BOT_TOKEN = 'MTM5ODc5MDUyMTY4NTY3MjAzNg.GvVRC_.WPOTtdnqpEBcezU6dB9TWrooDloKw3ew1u4xNM';
  
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
            console.log('📋 Channel Details:');
            console.log(`   Name: ${channel.name}`);
            console.log(`   Type: ${channel.type}`);
            console.log(`   Parent ID: ${channel.parent_id || 'None'}`);
            
            // Check if it's private
            const isPrivate = channel.type === 0 && !channel.parent_id;
            console.log(`\n🔒 Privacy Status:`);
            console.log(`   Is Private: ${isPrivate ? 'YES ✅' : 'NO ❌'}`);
            
            if (isPrivate) {
              console.log('   🎉 SUCCESS: Channel is properly set as private!');
              console.log('   🔒 Only people with invite links can access this channel');
            } else {
              console.log('   ⚠️  WARNING: Channel appears to be public');
              console.log('   🔍 This might indicate the private setting didn\'t work');
            }
          } else {
            console.error('❌ Error fetching channel:', data);
          }
          
          resolve(channel);
        } catch (error) {
          console.error('❌ Error parsing channel data:', error);
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

// Instructions for the user
console.log('🚀 Discord Private Channel Test');
console.log('='.repeat(50));
console.log('📝 Before running this test:');
console.log('   1. Update SUPABASE_URL with your actual Supabase project URL');
console.log('   2. Update SUPABASE_ANON_KEY with your actual anon key');
console.log('   3. Make sure your Discord bot function is deployed');
console.log('   4. Ensure DISCORD_BOT_TOKEN and DISCORD_MAIN_SERVER_ID are set');
console.log('\n🔧 To update the values:');
console.log('   - Edit this file and replace the placeholder values');
console.log('   - Or set them as environment variables');
console.log('\n📋 This test will:');
console.log('   1. Create a test private channel via the Discord bot function');
console.log('   2. Verify the channel is actually private');
console.log('   3. Show you the invite link');
console.log('\n' + '='.repeat(50));

// Uncomment the line below to run the test
// testPrivateChannelCreation().catch(console.error);

console.log('\n💡 To run the test, uncomment the last line in this file and run:');
console.log('   node test-private-channel-creation.js'); 