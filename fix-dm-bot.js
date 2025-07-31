// Fix DM Bot - specifically for handling DMs
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.on('ready', () => {
  console.log('=== FIX DM BOT READY ===');
  console.log(`Logged in as: ${client.user.tag}`);
  console.log('=========================');
  console.log('');
  console.log('📝 This bot should handle DMs properly');
  console.log('Send a DM to the bot and watch this console');
});

client.on('messageCreate', async (message) => {
  console.log('');
  console.log('=== MESSAGE RECEIVED ===');
  console.log(`From: ${message.author.tag}`);
  console.log(`Content: "${message.content}"`);
  console.log(`Channel Type: ${message.channel.type}`);
  console.log(`Is DM: ${!message.guild}`);
  console.log(`Channel ID: ${message.channel.id}`);
  console.log('========================');
  
  // Don't respond to our own messages
  if (message.author.id === client.user.id) {
    console.log('Skipping own message');
    return;
  }
  
  // Handle DMs specifically
  if (!message.guild) {
    console.log('✅ Processing DM...');
    try {
      const content = message.content.trim();
      
      if (/^[A-Za-z0-9]{6,8}$/.test(content)) {
        console.log(`🎮 Detected league code: ${content}`);
        await message.reply(`🎮 **Fantasy League Chess Bot**\n\nI see you're trying to join a league!\n\n**League Code:** ${content}\n\nPlease reply with your email address to continue.`);
      } else {
        console.log('💬 Sending default DM response');
        await message.reply(`🎮 **Fantasy League Chess Bot**\n\nTo join a league, please send me your league code (6-8 characters).`);
      }
      console.log('✅ DM response sent successfully');
    } catch (error) {
      console.error('❌ Error sending DM response:', error.message);
    }
  } else {
    console.log('⏭️ Skipping server message');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Fix DM Bot starting...');
console.log('This bot should handle DMs properly'); 