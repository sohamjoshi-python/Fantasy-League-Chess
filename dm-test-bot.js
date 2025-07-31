// DM Test Bot - specifically for testing DMs
import { Client, GatewayIntentBits, Partials, ChannelType } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.on('ready', () => {
  console.log('=== DM TEST BOT READY ===');
  console.log(`Logged in as: ${client.user.tag}`);
  console.log('==========================');
  console.log('');
  console.log('📝 Send a DM to the bot and watch this console');
  console.log('If you see "MESSAGE RECEIVED" then DMs are working');
});

client.on('messageCreate', async (message) => {
  console.log('');
  console.log('=== MESSAGE RECEIVED ===');
  console.log(`From: ${message.author.tag}`);
  console.log(`Content: "${message.content}"`);
  console.log(`Channel Type: ${message.channel.type}`);
  console.log(`Channel Type Enum: ${ChannelType[message.channel.type]}`);
  console.log(`Channel ID: ${message.channel.id}`);
  console.log(`Has Guild: ${!!message.guild}`);
  console.log(`Is DM (no guild): ${!message.guild}`);
  console.log(`Is DM (type check): ${message.channel.type === ChannelType.DM}`);
  console.log(`Is DM (type 1): ${message.channel.type === 1}`);
  console.log('========================');
  
  // Don't respond to our own messages
  if (message.author.id === client.user.id) {
    console.log('Skipping own message');
    return;
  }
  
  // Check if it's a DM using multiple methods
  const isDM = !message.guild || 
               message.channel.type === ChannelType.DM || 
               message.channel.type === 1;
  
  console.log(`Is DM (combined): ${isDM}`);
  
  if (isDM) {
    console.log('✅ Processing DM...');
    try {
      await message.reply('🤖 **DM Test Response**\n\nI received your DM! This means DMs are working.');
      console.log('✅ DM response sent successfully');
    } catch (error) {
      console.error('❌ Error sending DM response:', error.message);
    }
  } else {
    console.log('⏭️ Skipping - not a DM');
  }
});

client.on('error', (error) => {
  console.error('Bot error:', error);
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('DM Test Bot starting...');
console.log('This bot will test DM functionality'); 