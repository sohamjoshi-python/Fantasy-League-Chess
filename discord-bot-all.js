// Discord Bot that responds to ALL messages
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
  console.log('Discord Bot ready!');
  console.log('This bot will respond to ALL messages to test functionality');
});

client.on('messageCreate', async (message) => {
  console.log('📨 Message received!');
  console.log(`  From: ${message.author.tag}`);
  console.log(`  Channel type: ${message.channel.type}`);
  console.log(`  Content: "${message.content}"`);
  console.log(`  Channel ID: ${message.channel.id}`);
  
  // Don't respond to our own messages
  if (message.author.id === client.user.id) {
    console.log('  ⏭️ Skipping - our own message');
    return;
  }
  
  // Respond to all messages to test functionality
  try {
    if (message.content.toLowerCase().includes('xv1fxh')) {
      console.log('  🎮 Detected league code!');
      await message.reply('🎮 **Fantasy League Chess Bot**\n\nI see you\'re trying to join a league!\n\n**League Code:** XV1FXH\n\nPlease reply with your email address to continue.');
    } else {
      console.log('  💬 Sending test response');
      await message.reply('🤖 **Test Response**\n\nI received: ' + message.content + '\n\nThis tests if the bot can send messages.');
    }
    console.log('  ✅ Response sent successfully');
  } catch (error) {
    console.error('  ❌ Error sending response:', error);
    console.error('  Error details:', error.message);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Discord Bot started - responds to ALL messages');
console.log('Send any message to test if the bot can respond'); 