// Test script to understand Discord channel invite behavior
const https = require('https');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_MAIN_SERVER_ID = process.env.DISCORD_MAIN_SERVER_ID;

async function testDiscordChannelInvite() {
  console.log('Testing Discord channel invite creation...');
  
  // First, let's see what happens when we create a regular invite
  const testChannelId = '123456789'; // Replace with actual channel ID
  
  const inviteData = {
    max_age: 0,
    max_uses: 0,
    temporary: false,
    unique: true,
    target_type: 2, // Channel invite
    target_user_id: null,
    target_application_id: null
  };
  
  console.log('Invite data being sent:', JSON.stringify(inviteData, null, 2));
  
  // Make the API call
  const postData = JSON.stringify(inviteData);
  
  const options = {
    hostname: 'discord.com',
    port: 443,
    path: `/api/v10/channels/${testChannelId}/invites`,
    method: 'POST',
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data);
      try {
        const response = JSON.parse(data);
        console.log('Parsed response:', JSON.stringify(response, null, 2));
        
        if (response.code) {
          const inviteUrl = `https://discord.gg/${response.code}`;
          console.log('Generated invite URL:', inviteUrl);
          console.log('This URL should target the specific channel');
        }
      } catch (e) {
        console.error('Error parsing response:', e);
      }
    });
  });
  
  req.on('error', (e) => {
    console.error('Request error:', e);
  });
  
  req.write(postData);
  req.end();
}

// Run the test
testDiscordChannelInvite().catch(console.error); 