// Simple Test Bot - logs everything
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
  console.log('=== BOT READY ===');
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`Bot ID: ${client.user.id}`);
  console.log('==================');
  console.log('');
  console.log('📝 Now send a DM to the bot and watch this console...');
  console.log('If you see "MESSAGE RECEIVED" then the bot is working');
  console.log('If you see nothing, there\'s a permissions issue');
});

client.on('messageCreate', async (message) => {
  console.log('');
  console.log('=== MESSAGE RECEIVED ===');
  console.log(`From: ${message.author.tag} (${message.author.id})`);
  console.log(`Content: "${message.content}"`);
  console.log(`Channel Type: ${message.channel.type}`);
  console.log(`Channel ID: ${message.channel.id}`);
  console.log(`Guild: ${message.guild ? message.guild.name : 'No Guild (DM)'}`);
  console.log('========================');
  
  // Try to respond to ALL messages
  try {
    console.log('Attempting to send response...');
    await message.reply('🤖 **Test Response**\n\nI received your message!');
    console.log('✅ Response sent successfully!');
  } catch (error) {
    console.error('❌ Error sending response:', error.message);
  }
});

client.on('error', (error) => {
  console.error('Bot error:', error);
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Simple Test Bot starting...'); 