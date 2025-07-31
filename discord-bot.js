// Simple Discord Bot for Fantasy League Chess
import { Client, GatewayIntentBits, Partials, ChannelType } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Initialize Supabase
const supabaseUrl = process.env.SB_URL;
const supabaseServiceKey = process.env.SB_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables: SB_URL and SB_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Store pending verifications
const pendingVerifications = new Map();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Discord Bot ready!');
  console.log('Features:');
  console.log('✅ Handle league verification DMs');
  console.log('✅ Hybrid system (direct channel access)');
  console.log('✅ Secure verification process');
  console.log('');
  console.log('📝 Send a DM to the bot and watch this console for output...');
});

client.on('messageCreate', async (message) => {
  console.log('📨 Message received!');
  console.log(`  From: ${message.author.tag}`);
  console.log(`  Channel type: ${message.channel.type}`);
  console.log(`  Channel type enum: ${ChannelType[message.channel.type]}`);
  console.log(`  Content: "${message.content}"`);
  console.log(`  Is DM: ${message.channel.type === ChannelType.DM}`);
  console.log(`  Is DM (old way): ${message.channel.type === 'DM'}`);
  
  // Check if it's a DM using multiple methods
  const isDM = message.channel.type === ChannelType.DM || 
                message.channel.type === 'DM' || 
                message.channel.type === 1;
  
  console.log(`  Is DM (combined): ${isDM}`);
  
  // Only handle DMs
  if (!isDM) {
    console.log('  ⏭️ Skipping - not a DM');
    return;
  }
  
  console.log('  ✅ Processing DM...');
  
  const userId = message.author.id;
  const content = message.content.trim();
  
  try {
    // Check if user is in pending verification
    if (pendingVerifications.has(userId)) {
      const pending = pendingVerifications.get(userId);
      console.log(`  🔄 User in pending verification, step: ${pending.step}`);
      
      if (pending.step === 'waiting_for_email') {
        // User provided email, now verify and grant access
        const email = content;
        const leagueCode = pending.leagueCode;
        
        console.log(`  🔍 Verifying user ${userId} for league ${leagueCode} with email ${email}`);
        
        // Call the hybrid verification function
        const { data, error } = await supabase.functions.invoke('discord-bot-hybrid', {
          body: {
            action: 'verify_user_and_grant_access',
            userId: userId,
            leagueCode: leagueCode,
            email: email
          }
        });
        
        if (error) {
          console.error('  ❌ Function error:', error);
          await message.reply('❌ An error occurred. Please try again.');
          pendingVerifications.delete(userId);
          return;
        }
        
        if (data && data.data && data.data.success) {
          console.log(`  ✅ Verification successful: ${data.data.message}`);
          await message.reply(`✅ ${data.data.message}\n\nYou now have **direct access** to your league channel! No roles needed.`);
        } else {
          console.log(`  ❌ Verification failed: ${data.data.message}`);
          await message.reply(`❌ ${data.data.message || 'Verification failed. Please check your league code and email.'}`);
        }
        
        pendingVerifications.delete(userId);
        return;
      }
    }
    
    // Check if message looks like a league code (alphanumeric, 6-8 characters)
    if (/^[A-Za-z0-9]{6,8}$/.test(content)) {
      console.log(`  🎮 Detected league code: ${content}`);
      await message.reply(`🎮 **Fantasy League Chess Bot**\n\nI see you're trying to join a league!\n\n**League Code:** ${content}\n\nPlease reply with your email address to continue.`);
      
      pendingVerifications.set(userId, {
        step: 'waiting_for_email',
        leagueCode: content
      });
      console.log(`  📝 Set pending verification for user ${userId}`);
      return;
    }
    
    // Default response
    console.log(`  💬 Sending default response`);
    await message.reply(`🎮 **Fantasy League Chess Bot**\n\nTo join a league, please send me your league code (6-8 characters).`);
    
  } catch (error) {
    console.error('  ❌ Error handling DM:', error);
    await message.reply('❌ An error occurred. Please try again later.');
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

// Login
client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Discord Bot started with debugging');
console.log('Send a DM to the bot and watch this console for output'); 