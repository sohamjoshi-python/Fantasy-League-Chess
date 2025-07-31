// Test Bot - responds to server messages
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('ready', () => {
  console.log('=== TEST BOT READY ===');
  console.log(`Logged in as: ${client.user.tag}`);
  console.log('======================');
  console.log('');
  console.log('📝 This bot will respond to ALL messages (server and DMs)');
  console.log('Try sending a message in a server channel where the bot is present');
  console.log('Also try sending a DM to the bot');
});

client.on('messageCreate', async (message) => {
  console.log('');
  console.log('=== MESSAGE RECEIVED ===');
  console.log(`From: ${message.author.tag}`);
  console.log(`Content: "${message.content}"`);
  console.log(`Channel Type: ${message.channel.type}`);
  console.log(`Channel Name: ${message.channel.name || 'DM'}`);
  console.log(`Guild: ${message.guild ? message.guild.name : 'No Guild (DM)'}`);
  console.log('========================');
  
  // Don't respond to our own messages
  if (message.author.id === client.user.id) {
    console.log('Skipping own message');
    return;
  }
  
  // Respond to ALL messages
  try {
    if (message.guild) {
      // Server message
      await message.reply('🤖 **Server Response**\n\nI received your server message!');
      console.log('✅ Server response sent');
    } else {
      // DM message
      await message.reply('🤖 **DM Response**\n\nI received your DM!');
      console.log('✅ DM response sent');
    }
  } catch (error) {
    console.error('❌ Error sending response:', error.message);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Test Bot starting...');
console.log('This bot responds to server messages and DMs'); 