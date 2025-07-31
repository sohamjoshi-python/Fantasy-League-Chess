// Debug Bot - tests different message detection methods
import { Client, GatewayIntentBits, Events } from 'discord.js';
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
  console.log('=== DEBUG BOT READY ===');
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`Bot ID: ${client.user.id}`);
  console.log('=======================');
  console.log('');
  console.log('📝 Testing different message detection methods...');
  console.log('Send a DM to the bot and watch this console');
});

// Test method 1: messageCreate event
client.on('messageCreate', async (message) => {
  console.log('');
  console.log('=== MESSAGE RECEIVED (messageCreate) ===');
  console.log(`From: ${message.author.tag}`);
  console.log(`Content: "${message.content}"`);
  console.log(`Channel Type: ${message.channel.type}`);
  console.log(`Channel ID: ${message.channel.id}`);
  console.log(`Has Guild: ${!!message.guild}`);
  console.log(`Is Bot: ${message.author.bot}`);
  console.log('========================================');
  
  // Don't respond to our own messages
  if (message.author.id === client.user.id) {
    console.log('Skipping own message');
    return;
  }
  
  // Try to respond
  try {
    await message.reply('🤖 **Debug Response**\n\nI received your message via messageCreate event!');
    console.log('✅ Response sent via messageCreate');
  } catch (error) {
    console.error('❌ Error sending response:', error.message);
  }
});

// Test method 2: interactionCreate event (for slash commands)
client.on('interactionCreate', async (interaction) => {
  console.log('');
  console.log('=== INTERACTION RECEIVED ===');
  console.log(`Type: ${interaction.type}`);
  console.log(`User: ${interaction.user.tag}`);
  console.log('============================');
});

// Test method 3: channelCreate event
client.on('channelCreate', (channel) => {
  console.log('');
  console.log('=== CHANNEL CREATED ===');
  console.log(`Channel: ${channel.name}`);
  console.log(`Type: ${channel.type}`);
  console.log('=======================');
});

// Test method 4: guildMemberAdd event
client.on('guildMemberAdd', (member) => {
  console.log('');
  console.log('=== MEMBER JOINED ===');
  console.log(`Member: ${member.user.tag}`);
  console.log('=====================');
});

client.on('error', (error) => {
  console.error('Bot error:', error);
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Debug Bot starting...');
console.log('This bot will test multiple event handlers'); 