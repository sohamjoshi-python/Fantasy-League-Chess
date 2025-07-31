// All Messages Bot - responds to everything
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
  console.log('=== ALL MESSAGES BOT READY ===');
  console.log(`Logged in as: ${client.user.tag}`);
  console.log('================================');
  console.log('');
  console.log('📝 This bot will respond to ALL messages');
  console.log('Send a DM to test if the bot can receive DMs');
});

client.on('messageCreate', async (message) => {
  console.log('');
  console.log('=== MESSAGE RECEIVED ===');
  console.log(`From: ${message.author.tag}`);
  console.log(`Content: "${message.content}"`);
  console.log(`Channel Type: ${message.channel.type}`);
  console.log('========================');
  
  // Don't respond to our own messages
  if (message.author.id === client.user.id) {
    console.log('Skipping own message');
    return;
  }
  
  // Respond to ALL messages
  try {
    console.log('Attempting to send response...');
    await message.reply('🤖 **Test Response**\n\nI received your message!');
    console.log('✅ Response sent successfully');
  } catch (error) {
    console.error('❌ Error sending response:', error.message);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('All Messages Bot starting...');
console.log('This bot responds to ALL messages'); 