// Test Discord Bot - responds to all messages
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
  console.log('Test Discord Bot ready!');
  console.log('This bot will respond to ALL messages to test functionality');
});

client.on('messageCreate', async (message) => {
  console.log('📨 Message received!');
  console.log(`  From: ${message.author.tag}`);
  console.log(`  Channel type: ${message.channel.type}`);
  console.log(`  Content: "${message.content}"`);
  console.log(`  Has guild: ${!!message.guild}`);
  console.log(`  Channel ID: ${message.channel.id}`);
  
  // Respond to all messages to test if bot can send messages
  try {
    if (message.content.toLowerCase().includes('xv1fxh')) {
      console.log('  🎮 Detected league code!');
      await message.reply('🎮 **Fantasy League Chess Bot**\n\nI see you\'re trying to join a league!\n\n**League Code:** XV1FXH\n\nPlease reply with your email address to continue.');
    } else {
      console.log('  💬 Sending test response');
      await message.reply('🤖 **Test Bot Response**\n\nI received your message: ' + message.content + '\n\nThis is a test to verify the bot can send messages.');
    }
    console.log('  ✅ Response sent successfully');
  } catch (error) {
    console.error('  ❌ Error sending response:', error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Test Discord Bot started');
console.log('Send ANY message to the bot and it should respond'); 