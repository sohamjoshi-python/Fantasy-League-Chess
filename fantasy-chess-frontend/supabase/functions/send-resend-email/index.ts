import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecretKey } from '../_shared/supabaseKeys.ts';
import { GENERIC_ERROR, logServerError } from '../_shared/publicError.ts';
import { insertSiteNotification, recipientIsActive, type SiteDelivery } from '../_shared/siteNotification.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      to,
      subject,
      htmlContent,
      textContent,
      templateId,
      userId,
      leagueId,
      metadata,
      emailType,
      userEmail,
      delivery,
      notification,
    } = await req.json();
    const recipientEmail = to || userEmail;
    const siteDelivery: SiteDelivery =
      delivery === 'activity' || delivery === 'notification' ? delivery : 'email';
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = getSecretKey();
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!recipientEmail && siteDelivery === 'email') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing recipient email.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const emailId = crypto.randomUUID();
    const welcomeSubject = 'Welcome to Fantasy League Chess - Your Fantasy Chess Adventure Begins!';

    if (emailType === 'welcome') {
      const { data: existingWelcome } = await supabase
        .from('emails')
        .select('id')
        .eq('to_email', recipientEmail)
        .eq('status', 'sent')
        .eq('subject', welcomeSubject)
        .limit(1)
        .maybeSingle();

      if (existingWelcome) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, message: 'Welcome email already sent' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let finalSubject = subject;
    let finalHtmlContent = htmlContent;
    let finalTextContent = textContent;

    if (emailType === 'welcome') {
      finalSubject = welcomeSubject;
      finalHtmlContent = createWelcomeEmailHTML();
      finalTextContent = createWelcomeEmailText();
    } else if (emailType === 'weekly_results') {
      finalSubject = 'Your Weekly Fantasy Chess Results';
      finalHtmlContent = createWeeklyResultsEmailHTML();
      finalTextContent = createWeeklyResultsEmailText();
    }

    const skipSiteNotification = emailType === 'welcome' || metadata?.source === 'feedback_form';
    let notified = false;
    if (userId && !skipSiteNotification && siteDelivery !== 'email') {
      const note = notification || {};
      const rawMessage = note.message || finalSubject || 'You have a new update.';
      const message = String(rawMessage).replace(/\s+/g, ' ').trim().slice(0, 240);
      notified = await insertSiteNotification(supabase, {
        userId,
        leagueId,
        title: note.title || finalSubject || 'Fantasy League Chess',
        message,
        type: note.type || 'general',
        data: {
          ...(metadata || {}),
          link: note.link || null,
        },
      });
    }

    const userIsHere = siteDelivery === 'activity' && await recipientIsActive(supabase, userId);
    const shouldEmail = siteDelivery === 'email' || (siteDelivery === 'activity' && !userIsHere);
    let emailSent = false;
    let errorMessage = '';
    const providerUsed = 'Resend';
    const skipReason = siteDelivery === 'notification'
      ? 'notification_only'
      : userIsHere
        ? 'user_active'
        : '';

    if (shouldEmail) {
      if (!RESEND_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing RESEND_API_KEY environment variable.', notified }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      try {
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
          throw new Error(`Resend API error: ${resendResponse.status}`);
        }

        await resendResponse.json();
        emailSent = true;
      } catch (error: any) {
        logServerError('send-resend-email', error);
        errorMessage = 'Resend failed';
      }
    }

    const status = emailSent ? 'sent' : shouldEmail ? 'failed' : 'skipped';

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
          metadata: { ...metadata, providerUsed, errorMessage, notified, skipReason },
          sent_at: new Date().toISOString(),
          status,
        });
    } catch (dbError) {
      console.error('Database error storing email:', dbError);
    }

    if (emailSent || (!shouldEmail && notified)) {
      return new Response(
        JSON.stringify({
          success: true,
          emailId,
          providerUsed,
          emailed: emailSent,
          notified,
          skipped: !shouldEmail,
          message: emailSent ? 'Email sent successfully via Resend' : 'Notification saved without an email',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Failed to send email.', notified }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    logServerError('send-resend-email', err);
    return new Response(
      JSON.stringify({ success: false, error: GENERIC_ERROR }),
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
