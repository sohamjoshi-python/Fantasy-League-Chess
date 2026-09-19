import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, htmlContent, textContent, templateId, userId, leagueId, metadata, emailType, userEmail } = await req.json();
    const recipientEmail = to || userEmail;
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing RESEND_API_KEY environment variable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing recipient email.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const emailId = crypto.randomUUID();

    let emailSent = false;
    let errorMessage = '';
    let providerUsed = 'Resend';

    try {
      // Create email content based on type
      let finalSubject = subject;
      let finalHtmlContent = htmlContent;
      let finalTextContent = textContent;

      if (emailType === 'welcome') {
        finalSubject = 'Welcome to Fantasy League Chess - Your Fantasy Chess Adventure Begins!';
        finalHtmlContent = createWelcomeEmailHTML();
        finalTextContent = createWelcomeEmailText();
      } else if (emailType === 'weekly_results') {
        finalSubject = 'Your Weekly Fantasy Chess Results';
        finalHtmlContent = createWeeklyResultsEmailHTML();
        finalTextContent = createWeeklyResultsEmailText();
      }

      // Send email via Resend API
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Fantasy League Chess <noreply@fantasyleaguechess.com>',
          to: [recipientEmail],
          subject: finalSubject,
          html: finalHtmlContent,
          text: finalTextContent,
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.text();
        throw new Error(`Resend API error: ${resendResponse.status} - ${errorData}`);
      }

      const resendResult = await resendResponse.json();
      emailSent = true;
      console.log('Email sent successfully via Resend:', resendResult);

    } catch (error: any) {
      console.error('Resend send error:', error);
      errorMessage = `Resend failed: ${error.message}. `;
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
          to_email: recipientEmail,
          subject: finalSubject,
          html_content: finalHtmlContent,
          text_content: finalTextContent,
          metadata: { ...metadata, providerUsed, errorMessage },
          sent_at: new Date().toISOString(),
          status: emailSent ? 'sent' : 'failed',
        });
    } catch (dbError) {
      console.error('Database error storing email:', dbError);
      // Don't fail the email send if database storage fails
    }

    if (emailSent) {
      return new Response(
        JSON.stringify({ success: true, emailId, providerUsed, message: 'Email sent successfully via Resend' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to send email via Resend: ${errorMessage}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err: any) {
    console.error('Unexpected error in send-resend-email:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Error: ' + (err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Email template functions
function createWelcomeEmailHTML(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Fantasy League Chess</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; }
        .logo { max-width: 200px; height: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://fantasyleaguechess.com/assets/fantasy-league-chess-logo-updated.png" alt="Fantasy League Chess" class="logo">
          <h1>Welcome to Fantasy League Chess!</h1>
        </div>
        <div class="content">
          <p>Hello there,</p>
          <p>Thank you for joining Fantasy League Chess! We're thrilled to have you on board.</p>
          <p>Get ready to draft your dream team of chess players, compete in leagues, and climb the leaderboards.</p>
          <p>To get started, head over to your dashboard:</p>
          <p style="text-align: center;">
            <a href="https://fantasyleaguechess.com/dashboard" class="button">Go to Dashboard</a>
          </p>
          <p>If you have any questions, feel free to visit our help page or contact support.</p>
          <p>Happy strategizing!</p>
          <p>The Fantasy League Chess Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Fantasy League Chess. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createWelcomeEmailText(): string {
  return `
Welcome to Fantasy League Chess!

Hello there,

Thank you for joining Fantasy League Chess! We're thrilled to have you on board.

Get ready to draft your dream team of chess players, compete in leagues, and climb the leaderboards.

To get started, head over to your dashboard: https://fantasyleaguechess.com/dashboard

If you have any questions, feel free to visit our help page or contact support.

Happy strategizing!

The Fantasy League Chess Team

© ${new Date().getFullYear()} Fantasy League Chess. All rights reserved.
  `;
}

function createWeeklyResultsEmailHTML(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Fantasy Chess Results</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Weekly Fantasy Chess Results</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Here are your results from this week's Titled Tuesday tournament!</p>
          <p>Check your dashboard for detailed breakdowns and standings.</p>
          <p>The Fantasy League Chess Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Fantasy League Chess. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createWeeklyResultsEmailText(): string {
  return `
Your Weekly Fantasy Chess Results

Hello,

Here are your results from this week's Titled Tuesday tournament!

Check your dashboard for detailed breakdowns and standings.

The Fantasy League Chess Team

© ${new Date().getFullYear()} Fantasy League Chess. All rights reserved.
  `;
}
