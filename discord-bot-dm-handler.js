// Discord Bot DM Handler for League Verification
// This would be a separate Discord bot that handles DMs

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Store pending verifications
const pendingVerifications = new Map();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Only handle DMs
  if (message.channel.type !== 'DM') return;
  
  const userId = message.author.id;
  const content = message.content.trim();
  
  console.log(`DM from ${message.author.tag}: ${content}`);
  
  try {
    // Check if user is in pending verification
    if (pendingVerifications.has(userId)) {
      const pending = pendingVerifications.get(userId);
      
      if (pending.step === 'waiting_for_email') {
        // User provided email, now verify
        const email = content;
        const leagueCode = pending.leagueCode;
        
        // Call the verification function
        const { data, error } = await supabase.functions.invoke('discord-bot-verification', {
          body: {
            action: 'verify_user_and_assign_role',
            userId: userId,
            leagueCode: leagueCode,
            email: email
          }
        });
        
        if (error) {
          await message.reply('❌ An error occurred. Please try again.');
          pendingVerifications.delete(userId);
          return;
        }
        
        if (data.success) {
          await message.reply(`✅ ${data.message}\n\nYou now have access to the **${data.leagueName}** channel!`);
        } else {
          await message.reply(`❌ ${data.message}`);
        }
        
        pendingVerifications.delete(userId);
        return;
      }
    }
    
    // Check if message looks like a league code (alphanumeric, 6-8 characters)
    if (/^[A-Za-z0-9]{6,8}$/.test(content)) {
      // This might be a league code
      await message.reply(`🎮 **Fantasy League Chess Bot**\n\nI see you might be trying to join a league!\n\nTo join a league, please provide:\n1. **League Code**: ${content}\n2. **Your Email**: (the email you used to sign up)\n\nPlease reply with your email address to continue.`);
      
      pendingVerifications.set(userId, {
        step: 'waiting_for_email',
        leagueCode: content
      });
      return;
    }
    
    // Default welcome message
    if (content.toLowerCase().includes('help') || content.toLowerCase().includes('start')) {
      await message.reply(`🎮 **Welcome to Fantasy League Chess!**\n\nTo join a league Discord channel:\n\n1. **Get your league code** from the website\n2. **Send the league code** to me\n3. **Provide your email** (the one you used to sign up)\n4. **I'll verify you** and give you access!\n\nJust send me your league code to get started!`);
      return;
    }
    
    // Generic response
    await message.reply(`🎮 **Fantasy League Chess Bot**\n\nTo join a league, please send me your league code (6-8 characters).\n\nNeed help? Type "help" for instructions.`);
    
  } catch (error) {
    console.error('Error handling DM:', error);
    await message.reply('❌ An error occurred. Please try again later.');
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

// Login
client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Discord Bot DM Handler started'); 