import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { to, subject, htmlContent, textContent, templateId, userId, leagueId, metadata } = await req.json();
    
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!SENDGRID_API_KEY || !FROM_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Missing SENDGRID_API_KEY or FROM_EMAIL' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Generate unique email ID for tracking
    const emailId = crypto.randomUUID();

    // Send email via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ 
          to: [{ email: to }],
          custom_args: {
            email_id: emailId,
            user_id: userId || '',
            league_id: leagueId || '',
            template_id: templateId || ''
          }
        }],
        from: { email: FROM_EMAIL, name: 'Pawn Royale' },
        subject,
        content: [
          { type: 'text/html', value: htmlContent },
          { type: 'text/plain', value: textContent || stripHtml(htmlContent) }
        ],
        tracking_settings: {
          click_tracking: { enable: true, enable_text: true },
          open_tracking: { enable: true },
          subscription_tracking: { enable: false }
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid error:', error);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${error}` }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store email record in database for tracking
    try {
      await supabase
        .from('emails')
        .insert({
          id: emailId,
          user_id: userId,
          league_id: leagueId,
          template_id: templateId,
          to_email: to,
          subject,
          html_content: htmlContent,
          text_content: textContent || stripHtml(htmlContent),
          metadata,
          sent_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.error('Database error storing email:', dbError);
      // Don't fail the email send if database storage fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId,
        message: 'Email sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err: any) {
    console.error('Error in send-enhanced-email:', err);
    return new Response(
      JSON.stringify({ error: 'Error: ' + (err?.message || err) }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Utility function to strip HTML for text fallback
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
} 