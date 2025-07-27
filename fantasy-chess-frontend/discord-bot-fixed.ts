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
  const DISCORD_MAIN_SERVER_ID = Deno.env.get('DISCORD_MAIN_SERVER_ID');
  
  if (!DISCORD_MAIN_SERVER_ID) {
    throw new Error('Discord main server ID not configured - please set DISCORD_MAIN_SERVER_ID in Supabase environment variables');
  }

  console.log('Creating Discord channel with server ID:', DISCORD_MAIN_SERVER_ID);
  
  // Create channel data
  const channelData = {
    name: `🏆-${leagueName}`,
    type: 0, // Text channel
    topic: `Fantasy Chess League: ${leagueName}`,
    parent_id: null
  };
  
  console.log('Channel data being sent to Discord:', JSON.stringify(channelData, null, 2));
  console.log('Discord API endpoint:', `/guilds/${DISCORD_MAIN_SERVER_ID}/channels`);
  
  try {
    const channel = await discordApiRequest(`/guilds/${DISCORD_MAIN_SERVER_ID}/channels`, {
      method: 'POST',
      body: JSON.stringify(channelData)
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
• **Just hang out and chat with fellow chess enthusiasts!** 💬

📊 **League Info:**
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
    
    // Create an invite link for the channel
    const inviteData = await discordApiRequest(`/channels/${channelId}/invites`, {
      method: 'POST',
      body: JSON.stringify({
        max_age: 0, // Never expires
        max_uses: 0, // Unlimited uses
        temporary: false,
        unique: true,
      }),
    });

    const inviteUrl = `https://discord.gg/${inviteData.code}`;
    console.log('Invite URL created:', inviteUrl);

    // Store the Discord channel info in the database
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    await supabase
      .from('leagues')
      .update({
        discord_server_id: channelId, // We'll use this field to store channel ID
        discord_invite_link: inviteUrl,
      })
      .eq('id', leagueId);

    console.log('Database updated with Discord info');

    return { channelId, inviteUrl };
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
      }),
    });

    const inviteUrl = `https://discord.gg/${inviteData.code}`;
    console.log('Invite URL generated:', inviteUrl);
    
    return { inviteUrl };
  } catch (error) {
    console.error('Error generating invite link:', error);
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

    const { action, leagueName, leagueId, message, channelId } = parsedBody;
    console.log('Discord bot function called with action:', action);
    console.log('Extracted values:', { action, leagueName, leagueId, message, channelId });

    switch (action) {
      case 'create_league_channel':
        if (!leagueName || !leagueId) {
          return new Response(
            JSON.stringify({ error: 'Missing leagueName or leagueId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const result = await createLeagueDiscordChannel(leagueName, leagueId);
          return new Response(
            JSON.stringify({ success: true, ...result }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error in create_league_channel:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create Discord channel',
              details: error.message,
              suggestion: 'Please check Discord environment variables (DISCORD_BOT_TOKEN, DISCORD_MAIN_SERVER_ID) in Supabase project settings'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'send_league_message':
        if (!message || !channelId) {
          return new Response(
            JSON.stringify({ error: 'Missing message or channelId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const result = await sendLeagueChannelMessage(channelId, message);
          return new Response(
            JSON.stringify({ success: true, message: 'Message sent successfully' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error sending league message:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to send message', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'generate_invite':
        if (!channelId) {
          return new Response(
            JSON.stringify({ error: 'Missing channelId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const result = await generateLeagueInviteLink(channelId);
          return new Response(
            JSON.stringify({ success: true, ...result }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error generating invite:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to generate invite', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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