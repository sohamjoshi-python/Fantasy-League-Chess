// Simple Discord Bot - handles all messages
import { Client, GatewayIntentBits } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize Supabase
const supabaseUrl = process.env.SB_URL;
const supabaseServiceKey = process.env.SB_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables: SB_URL and SB_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Simple Discord Bot ready!');
  console.log('Send a DM to the bot and watch this console...');
});

client.on('messageCreate', async (message) => {
  console.log('📨 Message received!');
  console.log(`  From: ${message.author.tag}`);
  console.log(`  Channel type: ${message.channel.type}`);
  console.log(`  Content: "${message.content}"`);
  
  // Check if it's a DM by checking if the channel has a guild (server)
  const isDM = !message.guild;
  console.log(`  Is DM (no guild): ${isDM}`);
  
  if (isDM) {
    console.log('  ✅ Processing DM...');
    
    const content = message.content.trim();
    
    // Check if it looks like a league code
    if (/^[A-Za-z0-9]{6,8}$/.test(content)) {
      console.log(`  🎮 Detected league code: ${content}`);
      await message.reply(`🎮 **Fantasy League Chess Bot**\n\nI see you're trying to join a league!\n\n**League Code:** ${content}\n\nPlease reply with your email address to continue.`);
    } else {
      console.log(`  💬 Sending default response`);
      await message.reply(`🎮 **Fantasy League Chess Bot**\n\nTo join a league, please send me your league code (6-8 characters).`);
    }
  } else {
    console.log('  ⏭️ Skipping - not a DM');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Simple Discord Bot started');
console.log('Send a DM to the bot and watch this console for output'); 