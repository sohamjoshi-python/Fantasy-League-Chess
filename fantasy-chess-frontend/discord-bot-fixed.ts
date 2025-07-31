import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Discord API helper function
async function discordApiRequest(endpoint: string, options: RequestInit) {
  const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
  
  if (!DISCORD_BOT_TOKEN) {
    throw new Error('Discord bot token not configured - please set DISCORD_BOT_TOKEN in Supabase environment variables');
  }

  const url = `https://discord.com/api/v10${endpoint}`;
  console.log('Discord API Request:', {
    url,
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN.substring(0, 10)}...`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.parse(options.body as string) : undefined
  });

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  console.log('Discord API Response:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('Discord API Error Response:', errorText);
    throw new Error(`Discord API error: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log('Discord API Success Response:', responseData);
  return responseData;
}

// Create a Discord channel for a league
async function createLeagueDiscordChannel(leagueName: string, leagueId: string) {
  try {
    console.log('Creating Discord channel for league:', leagueName);
    
    const DISCORD_MAIN_SERVER_ID = Deno.env.get('DISCORD_MAIN_SERVER_ID');
    if (!DISCORD_MAIN_SERVER_ID) {
      throw new Error('DISCORD_MAIN_SERVER_ID not set');
    }

    // Step 1: Create a role for this league
    const roleData = await discordApiRequest(`/guilds/${DISCORD_MAIN_SERVER_ID}/roles`, {
      method: 'POST',
      body: JSON.stringify({
        name: `League-${leagueId.slice(0, 8)}`,
        color: 0x00ff00, // Green color
        hoist: false, // Don't show separately in member list
        mentionable: true,
        permissions: "0" // No special permissions, just for access control
      }),
    });
    
    console.log('Successfully created role:', roleData);
    const roleId = roleData.id;
    console.log('Role created with ID:', roleId);
    
    // Step 2: Create a private channel with role-based permissions
    const channel = await discordApiRequest(`/guilds/${DISCORD_MAIN_SERVER_ID}/channels`, {
      method: 'POST',
      body: JSON.stringify({
        name: `league-${leagueId.slice(0, 8)}`,
        type: 0, // Text channel
        parent_id: null,
        permission_overwrites: [
          {
            id: DISCORD_MAIN_SERVER_ID, // @everyone role
            type: 0,
            allow: "0",
            deny: "1024" // VIEW_CHANNEL permission - deny everyone
          },
          {
            id: roleId, // League role
            type: 0,
            allow: "1024", // VIEW_CHANNEL permission - allow league members
            deny: "0"
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
          allowed_mentions: { parse: [] } // Don't ping anyone
        })
      });
      console.log('Welcome message sent successfully');
    } catch (messageError) {
      console.error('Error sending welcome message:', messageError);
      // Don't fail the entire operation if welcome message fails
    }
    
    // Step 3: Create an invite link for the channel
    const inviteData = await discordApiRequest(`/channels/${channelId}/invites`, {
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
    console.log('Channel invite URL created:', inviteUrl);

    // Store the Discord channel info in the database
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    await supabase
      .from('leagues')
      .update({
        discord_server_id: channelId, // Store channel ID
        discord_invite_link: inviteUrl,
        discord_role_id: roleId // Store the role ID for future use
      })
      .eq('id', leagueId);

    console.log('Database updated with Discord info');

    return { channelId, roleId, inviteUrl };
  } catch (error) {
    console.error('Error creating Discord channel:', error);
    throw error;
  }
}

// Send a message to a Discord channel
async function sendLeagueChannelMessage(channelId: string, message: string) {
  try {
    await discordApiRequest(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: message }),
    });
    
    console.log('Message sent successfully to channel:', channelId);
    return { success: true };
  } catch (error) {
    console.error('Error sending message to Discord channel:', error);
    throw error;
  }
}

// Assign a user to a league role
async function assignUserToLeagueRole(userId: string, roleId: string) {
  try {
    console.log(`Attempting to assign user ${userId} to role ${roleId}`);
    
    const DISCORD_MAIN_SERVER_ID = Deno.env.get('DISCORD_MAIN_SERVER_ID');
    if (!DISCORD_MAIN_SERVER_ID) {
      throw new Error('DISCORD_MAIN_SERVER_ID not set');
    }

    console.log(`Using server ID: ${DISCORD_MAIN_SERVER_ID}`);

    const response = await discordApiRequest(`/guilds/${DISCORD_MAIN_SERVER_ID}/members/${userId}/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({})
    });
    
    console.log(`Successfully assigned user ${userId} to role ${roleId}`);
    return { success: true, message: `User ${userId} assigned to role ${roleId}` };
  } catch (error) {
    console.error('Error assigning user to role:', error);
    // Return a more detailed error response
    return { 
      success: false, 
      error: error.message,
      details: 'User might not be in the server or role might not exist'
    };
  }
}

// Remove a user from a league role
async function removeUserFromLeagueRole(userId: string, roleId: string) {
  try {
    console.log(`Attempting to remove user ${userId} from role ${roleId}`);
    
    const DISCORD_MAIN_SERVER_ID = Deno.env.get('DISCORD_MAIN_SERVER_ID');
    if (!DISCORD_MAIN_SERVER_ID) {
      throw new Error('DISCORD_MAIN_SERVER_ID not set');
    }

    console.log(`Using server ID: ${DISCORD_MAIN_SERVER_ID}`);

    const response = await discordApiRequest(`/guilds/${DISCORD_MAIN_SERVER_ID}/members/${userId}/roles/${roleId}`, {
      method: 'DELETE'
    });
    
    console.log(`Successfully removed user ${userId} from role ${roleId}`);
    return { success: true, message: `User ${userId} removed from role ${roleId}` };
  } catch (error) {
    console.error('Error removing user from role:', error);
    // Return a more detailed error response
    return { 
      success: false, 
      error: error.message,
      details: 'User might not be in the server or role might not exist'
    };
  }
}

// Generate an invite link for a Discord channel
async function generateLeagueInviteLink(channelId: string) {
  try {
    const inviteData = await discordApiRequest(`/channels/${channelId}/invites`, {
      method: 'POST',
      body: JSON.stringify({
        max_age: 0,
        max_uses: 0,
        temporary: false,
        unique: true,
        // For channel-specific invites, we need to use the correct approach
        target_type: 2, // Channel invite
        target_user_id: null,
        target_application_id: null
      }),
    });

    const inviteUrl = `https://discord.gg/${inviteData.code}`;
    console.log('Channel-specific invite URL generated:', inviteUrl);
    
    return { inviteUrl };
  } catch (error) {
    console.error('Error generating invite:', error);
    throw error;
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
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
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

    const { action, leagueName, leagueId, channelId, message, userId, roleId } = parsedBody;
    console.log('Action:', action);
    console.log('League name:', leagueName);
    console.log('League ID:', leagueId);

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

      case 'send_message':
        if (!channelId || !message) {
          return new Response(
            JSON.stringify({ error: 'Missing channelId or message' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await sendLeagueChannelMessage(channelId, message);
        break;

      case 'assign_user_to_role':
        if (!userId || !roleId) {
          return new Response(
            JSON.stringify({ error: 'Missing userId or roleId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await assignUserToLeagueRole(userId, roleId);
        break;

      case 'remove_user_from_role':
        if (!userId || !roleId) {
          return new Response(
            JSON.stringify({ error: 'Missing userId or roleId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await removeUserFromLeagueRole(userId, roleId);
        break;

      case 'generate_invite':
        if (!channelId) {
          return new Response(
            JSON.stringify({ error: 'Missing channelId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await generateLeagueInviteLink(channelId);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result) {
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: true, message: 'Action completed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in Discord bot function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        suggestion: 'Please check Discord environment variables in Supabase project settings'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 