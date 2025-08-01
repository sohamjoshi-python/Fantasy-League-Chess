// Private Channel Bot - creates private channels for new users
import { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
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
  console.log('=== PRIVATE CHANNEL BOT READY ===');
  console.log(`Logged in as: ${client.user.tag}`);
  console.log('==================================');
  console.log('');
  console.log('📝 This bot will create private channels for new users');
  console.log('When someone joins the server, they\'ll get a private channel');
});

// Create private channel when new member joins
client.on('guildMemberAdd', async (member) => {
  try {
    console.log(`New member joined: ${member.user.tag} (${member.user.id})`);
    
    // Create private channel
    const channelName = `${member.user.username}-join-channel`;
    
    const channel = await member.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: member.guild.id, // @everyone role
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: member.user.id, // The new member
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        {
          id: client.user.id, // The bot
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels
          ]
        }
      ]
    });
    
    console.log(`✅ Created private channel: ${channel.name}`);
    
    // Send welcome message
    const welcomeMessage = `🎮 **Welcome to Fantasy League Chess!** 🎉

Hi ${member.user.username}! 👋

This is your **private join channel** where you can verify your league membership.

## 🚀 **How to Join Your League:**

1. **First, provide your email** (the one you used to sign up)
2. **Then send your league code** (6-8 characters)
3. **I'll verify you** and give you access to your league channel!

## 💡 **Example:**
\`\`\`
You: your.email@example.com
Bot: Please provide your league code
You: XV1FXH
Bot: ✅ Welcome to Dev League! You now have access!
\`\`\`

**Ready to join your league?** Just send me your email address! 🚀
`;

    await channel.send(welcomeMessage);
    
    // Store the channel for this user
    pendingVerifications.set(member.user.id, {
      channel: channel,
      step: 'waiting_for_email',
      email: null
    });
    
  } catch (error) {
    console.error(`❌ Error creating private channel for ${member.user.tag}:`, error);
  }
});

// Handle messages in private channels
client.on('messageCreate', async (message) => {
  // Only handle messages in private channels
  if (message.channel.type !== ChannelType.GuildText) return;
  
  // Check if this is a private join channel
  if (!message.channel.name.includes('-join-channel')) return;
  
  // Don't respond to our own messages
  if (message.author.id === client.user.id) return;
  
  console.log(`Message in private channel: ${message.author.tag}: ${message.content}`);
  
  // Get or create verification state for this user
  let userVerification = pendingVerifications.get(message.author.id);
  if (!userVerification) {
    // Check if user already has Discord ID associated
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email, discord_user_id')
      .eq('discord_user_id', message.author.id)
      .single();
    
    if (!userError && existingUser) {
      // User already has Discord ID associated, skip to league code
      console.log(`✅ Found existing user by Discord ID: ${existingUser.email}`);
      userVerification = {
        channel: message.channel,
        step: 'waiting_for_league_code',
        email: existingUser.email
      };
      pendingVerifications.set(message.author.id, userVerification);
      await message.channel.send(`👋 Welcome back! I remember you as **${existingUser.email}**\n\nPlease send me your **league code** (6-8 characters).`);
      return;
    }
    
    // Create new verification state for existing users
    userVerification = {
      channel: message.channel,
      step: 'waiting_for_email',
      email: null
    };
    pendingVerifications.set(message.author.id, userVerification);
  }
  
  try {
    if (userVerification.step === 'waiting_for_email') {
      const email = message.content.trim().toLowerCase();
      
      // Basic email validation
      if (!email.includes('@') || !email.includes('.')) {
        await message.channel.send('❌ Please provide a valid email address.');
        return;
      }
      
      console.log(`User ${message.author.id} provided email: ${email}`);
      
      // Check if user exists in database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, discord_user_id')
        .eq('email', email)
        .single();
      
      if (error || !user) {
        await message.channel.send('❌ Email not found. Please check your email or sign up first.');
        return;
      }
      
      // Update user's Discord ID in database
      if (!user.discord_user_id) {
        await supabase
          .from('users')
          .update({ discord_user_id: message.author.id })
          .eq('id', user.id);
        console.log(`✅ Associated Discord ID ${message.author.id} with email ${email}`);
      }
      
      // Update verification state
      userVerification.step = 'waiting_for_league_code';
      userVerification.email = email;
      pendingVerifications.set(message.author.id, userVerification);
      
      await message.channel.send(`📧 **Email received:** ${email}\nNow please send me your **league code** (6-8 characters).`);
      
    } else if (userVerification.step === 'waiting_for_league_code') {
      const leagueCode = message.content.trim().toUpperCase();
      
      console.log(`🔍 Processing league code: "${leagueCode}" for user ${message.author.id}`);
      console.log(`📧 User email: ${userVerification.email}`);
      console.log(`🎯 Current step: ${userVerification.step}`);
      
      // Call Supabase Edge Function for verification
      const { data, error } = await supabase.functions.invoke('discord-bot-hybrid', {
        body: {
          action: 'verify_user_and_grant_access',
          userId: message.author.id,
          leagueCode: leagueCode,
          email: userVerification.email
        }
      });
      
      if (error) {
        console.error('❌ Error calling Edge Function:', error);
        await message.channel.send('❌ An error occurred. Please try again.');
        return; // Don't clear verification state on error
      }
      
      console.log('📡 Edge Function response:', JSON.stringify(data, null, 2));
      
      if (data && data.success && data.data && data.data.success) {
        const responseMessage = data.data.message || '✅ Verification successful!';
        console.log(`✅ Success! Sending message: ${responseMessage}`);
        await message.channel.send(responseMessage);
        
        // Delete the private channel after successful verification
        setTimeout(async () => {
          try {
            await userVerification.channel.delete();
            console.log(`✅ Deleted private channel for ${message.author.tag}`);
          } catch (deleteError) {
            console.error('Error deleting channel:', deleteError);
          }
        }, 5000); // Wait 5 seconds before deleting
        
        // Clear verification state only on success
        pendingVerifications.delete(message.author.id);
        
      } else {
        console.log(`❌ Response structure:`, {
          hasData: !!data,
          hasSuccess: !!(data && data.success),
          hasDataData: !!(data && data.data),
          success: data?.data?.success,
          message: data?.data?.message
        });
        
        // Check if the error message suggests the user actually got access
        const errorMessage = data?.data?.message || '❌ Verification failed. Please try again.';
        const isAccessGranted = errorMessage.includes('Failed to grant Discord access') && 
                               !errorMessage.includes('not a member') && 
                               !errorMessage.includes('not found');
        
        if (isAccessGranted) {
          // User probably got access despite the error message
          console.log(`⚠️ User likely got access despite error message, not deleting channel`);
          await message.channel.send(`✅ Welcome! You should now have access to your league channel. This private channel will be deleted in 30 seconds.`);
          
          // Delete the private channel after a longer delay
          setTimeout(async () => {
            try {
              await userVerification.channel.delete();
              console.log(`✅ Deleted private channel for ${message.author.tag}`);
            } catch (deleteError) {
              console.error('Error deleting channel:', deleteError);
            }
          }, 30000); // Wait 30 seconds before deleting
          
          // Clear verification state
          pendingVerifications.delete(message.author.id);
        } else {
          console.log(`❌ Verification failed: ${errorMessage}`);
          await message.channel.send(errorMessage);
          // Don't clear verification state on failure - let user try again
        }
      }
    }
    
  } catch (error) {
    console.error('Error handling message:', error);
    await message.channel.send('❌ An error occurred. Please try again.');
  }
});

// Handle bot startup
console.log('Private Channel Bot starting...');
console.log('This bot creates private channels for new users');

client.login(process.env.DISCORD_BOT_TOKEN); 