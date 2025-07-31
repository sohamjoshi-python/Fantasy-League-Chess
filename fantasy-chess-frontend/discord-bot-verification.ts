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

  return response.json();
}

// Create a league channel and role
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
        hoist: false,
        mentionable: true,
        permissions: "0"
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
          allowed_mentions: { parse: [] }
        })
      });
      console.log('Welcome message sent successfully');
    } catch (messageError) {
      console.error('Error sending welcome message:', messageError);
    }
    
    // Step 3: Create an invite link for the server (not channel)
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

// Verify user and assign role via DM
async function verifyUserAndAssignRole(userId: string, leagueCode: string, email: string) {
  try {
    console.log(`Verifying user ${userId} for league ${leagueCode} with email ${email}`);
    
    // Connect to Supabase
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Step 1: Find the league by code
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, discord_role_id, discord_server_id')
      .eq('join_code', leagueCode)
      .single();
    
    if (leagueError || !league) {
      return {
        success: false,
        message: '❌ League not found. Please check your league code.'
      };
    }
    
    // Step 2: Check if user is a member of this league
    const { data: member, error: memberError } = await supabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', league.id)
      .eq('user_id', email) // Assuming email is stored as user_id
      .single();
    
    if (memberError || !member) {
      return {
        success: false,
        message: '❌ You are not a member of this league. Please join the league first on the website.'
      };
    }
    
    // Step 3: Check if user is in Discord server
    const DISCORD_MAIN_SERVER_ID = Deno.env.get('DISCORD_MAIN_SERVER_ID');
    if (!DISCORD_MAIN_SERVER_ID) {
      throw new Error('DISCORD_MAIN_SERVER_ID not set');
    }
    
    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_MAIN_SERVER_ID}/members/${userId}`, {
      headers: {
        'Authorization': `Bot ${Deno.env.get('DISCORD_BOT_TOKEN')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!memberResponse.ok) {
      return {
        success: false,
        message: '❌ You are not in the Discord server. Please join the server first using the invite link.'
      };
    }
    
    // Step 4: Assign the role
    if (!league.discord_role_id) {
      return {
        success: false,
        message: '❌ League Discord setup incomplete. Please contact support.'
      };
    }
    
    await discordApiRequest(`/guilds/${DISCORD_MAIN_SERVER_ID}/members/${userId}/roles/${league.discord_role_id}`, {
      method: 'PUT',
      body: JSON.stringify({})
    });
    
    console.log(`Successfully assigned user ${userId} to role ${league.discord_role_id}`);
    
    return {
      success: true,
      message: `✅ Welcome to **${league.name}**! You now have access to the league channel.`,
      leagueName: league.name
    };
    
  } catch (error) {
    console.error('Error verifying user and assigning role:', error);
    return {
      success: false,
      message: '❌ An error occurred. Please try again or contact support.'
    };
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

    const { action, leagueName, leagueId, channelId, message, userId, leagueCode, email } = parsedBody;
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

      case 'verify_user_and_assign_role':
        if (!userId || !leagueCode || !email) {
          return new Response(
            JSON.stringify({ error: 'Missing userId, leagueCode, or email' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await verifyUserAndAssignRole(userId, leagueCode, email);
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