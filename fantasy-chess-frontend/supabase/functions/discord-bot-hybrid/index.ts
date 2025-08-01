import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function discordApiRequest(endpoint: string, options: RequestInit) {
  const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
  const DISCORD_MAIN_SERVER_ID = Deno.env.get('DISCORD_MAIN_SERVER_ID');
  
  if (!DISCORD_BOT_TOKEN || !DISCORD_MAIN_SERVER_ID) {
    throw new Error('Missing Discord environment variables');
  }

  const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Discord API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Discord API error: ${response.status} ${errorText}`);
  }

  // Handle empty responses (like 204 No Content)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.log(`Discord API response: ${response.status} ${response.statusText} (no JSON content)`);
    return null; // Return null for empty responses
  }

  return response.json();
}

// Create a league channel with direct user access
async function createLeagueDiscordChannel(leagueName: string, leagueId: string) {
  try {
    console.log('🔍 DEBUG: Creating Discord channel for league:');
    console.log('   leagueName:', leagueName);
    console.log('   leagueId:', leagueId);
    console.log('   leagueName type:', typeof leagueName);
    console.log('   leagueId type:', typeof leagueId);
    
    const DISCORD_MAIN_SERVER_ID = Deno.env.get('DISCORD_MAIN_SERVER_ID');
    if (!DISCORD_MAIN_SERVER_ID) {
      throw new Error('DISCORD_MAIN_SERVER_ID not set');
    }

    // Create a private channel with no role permissions initially
    const channelName = `league-${leagueName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    console.log('🔍 DEBUG: Channel name will be:', channelName);
    
    const channel = await discordApiRequest(`/guilds/${DISCORD_MAIN_SERVER_ID}/channels`, {
      method: 'POST',
      body: JSON.stringify({
        name: channelName,
        type: 0, // Text channel
        parent_id: null,
        permission_overwrites: [
          {
            id: DISCORD_MAIN_SERVER_ID, // @everyone role
            type: 0,
            allow: "0",
            deny: "1024" // VIEW_CHANNEL permission - deny everyone
          }
        ]
      }),
    });
    
    console.log('Successfully created channel:', channel);
    
    const channelId = channel.id;
    console.log('Channel created with ID:', channelId);
    
    // Send a welcome message to the new channel
    const welcomeMessage = `🎉 **Welcome to ${leagueName}!** 🎉

This is your dedicated Discord channel for the **${leagueName}** Fantasy Chess League!

🏆 **What you can do here:**
• Discuss strategies and share insights
• Celebrate victories and analyze games
• Coordinate with your league members
• Get updates on league standings and events
• **Just hang out and chat with fellow chess enthusiasts!** 🎮

📋 **League Info:**
• League Name: \`${leagueName}\`
• Channel created: <t:${Math.floor(Date.now() / 1000)}:F>

🎮 **Ready to dominate the chessboard?** Let the games begin!

---
*This channel was automatically created by the Fantasy League Chess Bot* 🤖`;
    
    try {
      await discordApiRequest(`/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ 
          content: welcomeMessage,
          allowed_mentions: { parse: [] }
        })
      });
      console.log('Welcome message sent successfully');
    } catch (messageError) {
      console.error('Error sending welcome message:', messageError);
    }
    
    // Create an invite link for the server
    const inviteData = await discordApiRequest(`/channels/${DISCORD_MAIN_SERVER_ID}/invites`, {
      method: 'POST',
      body: JSON.stringify({
        max_age: 0, // Never expires
        max_uses: 0, // Unlimited uses
        temporary: false,
        unique: true
      }),
    });

    if (!inviteData.code) {
      throw new Error('Failed to create invite link: No code returned');
    }

    const inviteUrl = `https://discord.gg/${inviteData.code}`;
    console.log('Server invite URL created:', inviteUrl);

    // Store the Discord channel info in the database
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    await supabase
      .from('leagues')
      .update({
        discord_server_id: channelId, // Store channel ID
        discord_invite_link: inviteUrl
      })
      .eq('id', leagueId);

    console.log('Database updated with Discord info');

    return { channelId, inviteUrl };
  } catch (error) {
    console.error('Error creating Discord channel:', error);
    throw error;
  }
}

// Verify user and grant direct channel access
async function verifyUserAndGrantAccess(userId: string, leagueCode: string, email: string) {
  try {
    console.log(`🔍 Starting verification for user ${userId} for league ${leagueCode} with email ${email}`);
    
    // Connect to Supabase
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Step 1: Find the league by code
    console.log(`📋 Step 1: Looking up league with code "${leagueCode}"`);
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id, member_ids')
      .eq('join_code', leagueCode)
      .single();
    
    if (leagueError || !league) {
      console.log(`❌ League not found: ${leagueError?.message || 'No league data'}`);
      return {
        success: false,
        message: '❌ League not found. Please check your league code.'
      };
    }
    
    console.log(`✅ Found league: ${league.name} (ID: ${league.id})`);
    console.log(`📊 League member_ids: ${JSON.stringify(league.member_ids)}`);
    
    // Step 2: Find the user by Discord ID first, then by email
    console.log(`👤 Step 2: Looking up user by Discord ID ${userId}`);
    let user = null;
    let userError = null;
    
    // Try to find user by Discord ID first
    const { data: userByDiscord, error: discordError } = await supabase
      .from('users')
      .select('id, email, discord_user_id')
      .eq('discord_user_id', userId)
      .single();
    
    if (!discordError && userByDiscord) {
      user = userByDiscord;
      console.log(`✅ Found user by Discord ID: ${user.id} with email: ${user.email}`);
    } else {
      console.log(`🔍 Discord ID lookup failed, trying email: ${email}`);
      // Fallback to email lookup
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('id, email, discord_user_id')
        .eq('email', email)
        .single();
      
      user = userByEmail;
      userError = emailError;
      
      if (!userError && user) {
        console.log(`✅ Found user by email: ${user.id} with email: ${user.email}`);
        
        // Update Discord ID if not set
        if (!user.discord_user_id) {
          console.log(`🔗 Associating Discord ID ${userId} with user ${user.id}`);
          await supabase
            .from('users')
            .update({ discord_user_id: userId })
            .eq('id', user.id);
          console.log(`✅ Associated Discord ID ${userId} with user ${user.id}`);
        }
      }
    }
    
    if (userError || !user) {
      console.log(`❌ User not found: ${userError?.message || 'No user data'}`);
      return {
        success: false,
        message: '❌ User not found. Please check your email or sign up first.'
      };
    }
    
    console.log(`🎯 Step 3: Checking if user ${user.id} is member of league ${league.id}`);
    console.log(`📋 League member_ids: ${JSON.stringify(league.member_ids)}`);
    console.log(`🔍 User ID: ${user.id}`);
    console.log(`✅ Is member: ${league.member_ids && Array.isArray(league.member_ids) && league.member_ids.includes(user.id)}`);
    
    // Step 3: Check if user is a member of this league using member_ids array
    if (!league.member_ids || !Array.isArray(league.member_ids) || !league.member_ids.includes(user.id)) {
      console.log(`❌ User ${user.id} is not a member of league ${league.id}`);
      return {
        success: false,
        message: '❌ You are not a member of this league. Please join the league first on the website.'
      };
    }
    
    console.log(`✅ Confirmed user ${user.id} is member of league ${league.id}`);
    
    // Step 4: Check if user is in Discord server
    console.log(`🎮 Step 4: Checking if user is in Discord server`);
    const DISCORD_MAIN_SERVER_ID = Deno.env.get('DISCORD_MAIN_SERVER_ID');
    if (!DISCORD_MAIN_SERVER_ID) {
      console.log(`❌ DISCORD_MAIN_SERVER_ID not set`);
      throw new Error('DISCORD_MAIN_SERVER_ID not set');
    }
    
    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_MAIN_SERVER_ID}/members/${userId}`, {
      headers: {
        'Authorization': `Bot ${Deno.env.get('DISCORD_BOT_TOKEN')}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📡 Discord member check response: ${memberResponse.status} ${memberResponse.statusText}`);
    
    if (!memberResponse.ok) {
      console.log(`❌ User ${userId} is not in Discord server`);
      return {
        success: false,
        message: '❌ You are not in the Discord server. Please join the server first using the invite link.'
      };
    }
    
    console.log(`✅ User ${userId} is in Discord server`);
    
    // Step 5: Grant direct channel access
    console.log(`🔐 Step 5: Granting channel access`);
    if (!league.discord_server_id) {
      console.log(`❌ League ${league.id} has no discord_server_id`);
      return {
        success: false,
        message: '❌ League Discord setup incomplete. Please contact support.'
      };
    }
    
    console.log(`🎯 Granting access to channel ${league.discord_server_id} for user ${userId}`);
    
    // Add user directly to channel permissions
    try {
      const result = await discordApiRequest(`/channels/${league.discord_server_id}/permissions/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          type: 1, // User
          allow: "1024", // VIEW_CHANNEL permission
          deny: "0"
        })
      });
      
      // Discord API for permissions returns empty response (204) on success
      console.log(`✅ Successfully granted channel access to user ${userId}`);
      
      return {
        success: true,
        message: `✅ Welcome to **${league.name}**! You now have access to the league channel.`,
        leagueName: league.name
      };
    } catch (discordError) {
      console.error('❌ Discord API error:', discordError);
      return {
        success: false,
        message: '❌ Failed to grant Discord access. Please try again or contact support.'
      };
    }
    
  } catch (error) {
    console.error('❌ Error verifying user and granting access:', error);
    return {
      success: false,
      message: '❌ An error occurred. Please try again or contact support.'
    };
  }
}

// Remove user's direct channel access
async function removeUserChannelAccess(userId: string, leagueCode: string) {
  try {
    console.log(`Removing channel access for user ${userId} from league ${leagueCode}`);
    
    // Connect to Supabase
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Find the league by code
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, discord_server_id')
      .eq('join_code', leagueCode)
      .single();
    
    if (leagueError || !league) {
      return {
        success: false,
        message: '❌ League not found.'
      };
    }
    
    // Remove user's channel permissions
    await discordApiRequest(`/channels/${league.discord_server_id}/permissions/${userId}`, {
      method: 'DELETE'
    });
    
    console.log(`Successfully removed channel access for user ${userId}`);
    
    return {
      success: true,
      message: `✅ Removed access to **${league.name}** channel.`
    };
    
  } catch (error) {
    console.error('Error removing user channel access:', error);
    return {
      success: false,
      message: '❌ An error occurred while removing access.'
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Discord bot function called');
    console.log('Request method:', req.method);
    
    const body = await req.text();
    console.log('Raw request body:', body);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      console.log('Parsed JSON body:', parsedBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, leagueName, leagueId, userId, leagueCode, email } = parsedBody;
    console.log('Action:', action);

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'create_league_channel':
        if (!leagueName || !leagueId) {
          return new Response(
            JSON.stringify({ error: 'Missing leagueName or leagueId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await createLeagueDiscordChannel(leagueName, leagueId);
        break;

      case 'verify_user_and_grant_access':
        if (!userId || !leagueCode || !email) {
          return new Response(
            JSON.stringify({ error: 'Missing userId, leagueCode, or email' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await verifyUserAndGrantAccess(userId, leagueCode, email);
        break;

      case 'remove_user_access':
        if (!userId || !leagueCode) {
          return new Response(
            JSON.stringify({ error: 'Missing userId or leagueCode' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await removeUserChannelAccess(userId, leagueCode);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('Operation completed successfully:', result);
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in Discord bot function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 