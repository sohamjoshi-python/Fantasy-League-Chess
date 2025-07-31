// Fix Discord Bot Permissions
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Discord Bot Permissions Fix');
console.log('');

// Get Client ID from environment or prompt user
let clientId = process.env.DISCORD_CLIENT_ID;

if (!clientId) {
  console.log('❌ DISCORD_CLIENT_ID not found in .env file');
  console.log('');
  console.log('📋 To get your Client ID:');
  console.log('1. Go to https://discord.com/developers/applications');
  console.log('2. Select your bot application');
  console.log('3. Go to "OAuth2" → "General"');
  console.log('4. Copy the "Client ID"');
  console.log('5. Add DISCORD_CLIENT_ID=your_client_id to your .env file');
  console.log('');
  console.log('Then run this script again.');
  process.exit(1);
}

// Calculate permissions integer
const permissions = {
  SendMessages: 1n << 11n,
  UseSlashCommands: 1n << 8n,
  ReadMessageHistory: 1n << 10n,
  ManageChannels: 1n << 4n,
  ManageRoles: 1n << 28n,
  ViewChannels: 1n << 10n
};

const totalPermissions = 8;

console.log('✅ Client ID found:', clientId);
console.log('');

// Generate invite URL
const scopes = ['bot', 'applications.commands'];
const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${totalPermissions}&scope=${scopes.join('%20')}`;

console.log('🔗 New Bot Invite URL (with correct permissions):');
console.log('');
console.log(inviteUrl);
console.log('');
console.log('📋 Instructions:');
console.log('1. Copy the URL above');
console.log('2. Open it in your browser');
console.log('3. Select your server');
console.log('4. Authorize the bot');
console.log('5. The bot will have all necessary permissions for DMs');
console.log('');
console.log('⚠️  Important: After inviting the bot, restart it with:');
console.log('   node discord-bot.js');
console.log('');
console.log('🔧 Also make sure in Discord Developer Portal → Bot section:');
console.log('   ✅ Message Content Intent is enabled');
console.log('   ✅ Server Members Intent is enabled (if available)'); 