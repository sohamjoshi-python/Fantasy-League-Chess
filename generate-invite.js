// Generate Discord Bot Invite URL with correct permissions
import dotenv from 'dotenv';

dotenv.config();

const clientId = process.env.DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const permissions = [
  'SendMessages',
  'UseSlashCommands',
  'ReadMessageHistory',
  'ManageChannels',
  'ManageRoles'
].join('%20');

const scopes = ['bot', 'applications.commands'].join('%20');

const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=${scopes}`;

console.log('🔗 Discord Bot Invite URL:');
console.log('');
console.log(inviteUrl);
console.log('');
console.log('📋 Instructions:');
console.log('1. Copy the URL above');
console.log('2. Open it in your browser');
console.log('3. Select your server');
console.log('4. Authorize the bot');
console.log('5. The bot will have all necessary permissions');
console.log('');
console.log('⚠️  Note: If you don\'t have DISCORD_CLIENT_ID in your .env file,');
console.log('   you\'ll need to get it from Discord Developer Portal → OAuth2 → Client ID'); 