// Simple test to check if Discord bot can send messages
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
  console.log('Bot is ready!');
  console.log('');
  console.log('📝 Now send a DM to the bot and watch this console...');
  console.log('If you see "Message received!" then the bot is working');
  console.log('If you don\'t see anything, there\'s an issue with permissions');
});

client.on('messageCreate', async (message) => {
  console.log('📨 MESSAGE RECEIVED!');
  console.log(`From: ${message.author.tag}`);
  console.log(`Content: "${message.content}"`);
  console.log(`Channel type: ${message.channel.type}`);
  
  if (message.channel.type === 'DM') {
    console.log('✅ This is a DM - responding...');
    await message.reply('Hello! I received your message: ' + message.content);
  } else {
    console.log('⏭️ Not a DM - ignoring');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Simple Discord Bot Test');
console.log('Send a DM to the bot and watch for "MESSAGE RECEIVED!"'); 