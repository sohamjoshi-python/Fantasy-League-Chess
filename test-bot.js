// Test Bot - responds to ALL messages
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Test Bot ready!');
  console.log('This bot will respond to ALL messages');
});

client.on('messageCreate', async (message) => {
  console.log('📨 MESSAGE RECEIVED!');
  console.log(`From: ${message.author.tag}`);
  console.log(`Content: "${message.content}"`);
  console.log(`Channel type: ${message.channel.type}`);
  
  // Don't respond to our own messages
  if (message.author.id === client.user.id) {
    console.log('Skipping own message');
    return;
  }
  
  // Respond to ALL messages
  try {
    console.log('Sending response...');
    await message.reply('🤖 **Test Bot Response**\n\nI received your message: ' + message.content);
    console.log('✅ Response sent successfully!');
  } catch (error) {
    console.error('❌ Error sending response:', error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Test Bot starting...'); 