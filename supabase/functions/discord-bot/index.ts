import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord API error: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  return responseData;
}

// Create a Discord channel for a league
async function createLeagueDiscordChannel(leagueName: string, leagueId: string) {
  const DISCORD_MAIN_SERVER_ID = Deno.env.get('DISCORD_MAIN_SERVER_ID');
  
  if (!DISCORD_MAIN_SERVER_ID) {
    throw new Error('Discord main server ID not configured - please set DISCORD_MAIN_SERVER_ID in Supabase environment variables');
  }

  // Create channel data
  const channelData = {
    name: `🏆-${leagueName}`,
    type: 0, // Text channel
    topic: `Fantasy Chess League: ${leagueName}`,
    parent_id: null,
    permission_overwrites: [
      {
        id: DISCORD_MAIN_SERVER_ID, // @everyone role (same as server ID)
        type: 0, // role type
        allow: "0", // no permissions
        deny: "1024" // deny VIEW_CHANNEL permission (1024)
      }
    ]
  };
  
  try {
    const channel = await discordApiRequest(`/guilds/${DISCORD_MAIN_SERVER_ID}/channels`, {
      method: 'POST',
      body: JSON.stringify(channelData)
    });
    
    const channelId = channel.id;
    
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, leagueName, leagueId, message, channelId } = parsedBody;

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
          await discordApiRequest(`/channels/${channelId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content: message }),
          });

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

          return new Response(
            JSON.stringify({ success: true, inviteUrl }),
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