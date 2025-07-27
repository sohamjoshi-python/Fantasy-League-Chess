import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, text, emailType } = await req.json();
    
    // For now, just log the email request
    console.log('Email request:', { to, subject, text, emailType });

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email request received (logging only)' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err: any) {
    console.error('Error in send-email:', err);
    return new Response(
      JSON.stringify({ error: 'Error: ' + (err?.message || err) }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
