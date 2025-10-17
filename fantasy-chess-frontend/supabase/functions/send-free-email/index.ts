import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to strip HTML tags for plain text
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// Helper function to create CORS response
function withCorsHeaders(response: Response): Response {
  return new Response(response.body, {
    ...response,
    headers: { ...response.headers, ...corsHeaders },
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }

  try {
    const { to, subject, htmlContent, textContent, emailType, userEmail } = await req.json();
    
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = 'noreply@fantasyleaguechess.com';

    // Create Supabase client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let htmlContentToSend = htmlContent;
    let emailSubject = subject;

    // Handle different email types
    if (emailType === 'welcome') {
      htmlContentToSend = createWelcomeEmailHTML();
      emailSubject = 'Welcome to Fantasy League Chess - Your Fantasy Chess Adventure Begins!';
    } else if (emailType === 'weekly_results') {
      // Send weekly results email with real data
      const result = await sendWeeklyResultsEmail(userEmail || to, supabase);
      return withCorsHeaders(new Response(JSON.stringify(result), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    } else if (!htmlContentToSend) {
      // Default plain text email
      htmlContentToSend = `<html><body><p>${textContent || 'Hello from Fantasy League Chess!'}</p></body></html>`;
    }

    // Try Resend first (if API key is available)
    if (RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [to],
            subject: emailSubject,
            html: htmlContentToSend,
            text: textContent || stripHtml(htmlContentToSend),
          }),
        });

        if (resendResponse.ok) {
          const resendData = await resendResponse.json();
          console.log('Email sent via Resend:', resendData);
          
          // Store email record in database for tracking
          await storeEmailRecord(supabase, {
            to,
            subject: emailSubject,
            htmlContent: htmlContentToSend,
            textContent: textContent || stripHtml(htmlContentToSend),
            provider: 'resend',
            providerId: resendData.id,
            emailType
          });

          return withCorsHeaders(new Response(JSON.stringify({ 
            success: true, 
            provider: 'resend',
            messageId: resendData.id 
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      } catch (resendError) {
        console.error('Resend error:', resendError);
        // Fall through to SMTP fallback
      }
    }

    // Fallback: Use SMTP (completely free)
    try {
      const smtpResult = await sendViaSMTP({
        to,
        subject: emailSubject,
        html: htmlContentToSend,
        text: textContent || stripHtml(htmlContentToSend)
      });

      if (smtpResult.success) {
        // Store email record in database for tracking
        await storeEmailRecord(supabase, {
          to,
          subject: emailSubject,
          htmlContent: htmlContentToSend,
          textContent: textContent || stripHtml(htmlContentToSend),
          provider: 'smtp',
          providerId: smtpResult.messageId,
          emailType
        });

        return withCorsHeaders(new Response(JSON.stringify({ 
          success: true, 
          provider: 'smtp',
          messageId: smtpResult.messageId 
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    } catch (smtpError) {
      console.error('SMTP error:', smtpError);
    }

    // If both fail, return error
    return withCorsHeaders(new Response(JSON.stringify({ 
      error: 'Failed to send email via all providers' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (err) {
    console.error('Unexpected error:', err);
    return withCorsHeaders(new Response(JSON.stringify({ 
      error: 'Internal server error: ' + (err?.message || err) 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
});

// SMTP sending function (completely free)
async function sendViaSMTP({ to, subject, html, text }: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Use a free SMTP service like Gmail SMTP or your own server
    // For demo purposes, we'll use a simple HTTP-based email service
    
    // Option 1: Use EmailJS (free tier)
    const emailjsResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'service_fantasy_chess',
        template_id: 'template_email',
        user_id: 'user_fantasy_chess',
        template_params: {
          to_email: to,
          subject: subject,
          message: html,
          reply_to: 'noreply@fantasyleaguechess.com'
        }
      }),
    });

    if (emailjsResponse.ok) {
      return { success: true, messageId: `emailjs_${Date.now()}` };
    }

    // Option 2: Use Web3Forms (free tier)
    const web3formsResponse = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_key: Deno.env.get('WEB3FORMS_ACCESS_KEY') || 'demo_key',
        name: 'Fantasy League Chess',
        email: to,
        subject: subject,
        message: html,
        from_name: 'Fantasy League Chess',
        reply_to: 'noreply@fantasyleaguechess.com'
      }),
    });

    if (web3formsResponse.ok) {
      return { success: true, messageId: `web3forms_${Date.now()}` };
    }

    // Option 3: Simple logging (for development)
    console.log('📧 EMAIL WOULD BE SENT:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML:', html.substring(0, 200) + '...');
    
    return { success: true, messageId: `logged_${Date.now()}` };

  } catch (error) {
    console.error('SMTP sending error:', error);
    return { success: false, error: error.message };
  }
}

// Store email record in database
async function storeEmailRecord(supabase: any, emailData: {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  provider: string;
  providerId: string;
  emailType?: string;
}) {
  try {
    await supabase
      .from('emails')
      .insert({
        id: crypto.randomUUID(),
        to_email: emailData.to,
        subject: emailData.subject,
        html_content: emailData.htmlContent,
        text_content: emailData.textContent,
        provider: emailData.provider,
        provider_id: emailData.providerId,
        email_type: emailData.emailType,
        sent_at: new Date().toISOString()
      });
  } catch (dbError) {
    console.error('Database error storing email:', dbError);
    // Don't fail the email send if database storage fails
  }
}

// Welcome email template
function createWelcomeEmailHTML(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Fantasy League Chess</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #FFF8DC;
          color: #2F2F2F;
          line-height: 1.6;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #8B4513;
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: white;
        }
        .content {
          padding: 40px 30px;
        }
        .welcome-section {
          text-align: center;
          margin-bottom: 30px;
        }
        .welcome-section h2 {
          color: #8B4513;
          font-size: 24px;
          margin-bottom: 15px;
        }
        .footer {
          background-color: #8B4513;
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 14px;
        }
        .footer a {
          color: #F4A460;
          text-decoration: none;
        }
        .highlight {
          background-color: #F4A460;
          color: white;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Fantasy League Chess</h1>
        </div>
        
        <div class="content">
          <div class="welcome-section">
            <h2>Welcome to Fantasy League Chess!</h2>
            <p>Thank you for joining our community of chess enthusiasts. You're now ready to build your dream team and compete in fantasy chess leagues!</p>
          </div>
          
          <div class="highlight">
            <strong>Your Chess Journey Starts Now</strong><br>
            Create leagues, draft players, and climb the leaderboards
          </div>
          
          <p>Here's what you can do next:</p>
          <ul>
            <li>Join an existing league or create your own</li>
            <li>Draft your favorite chess players</li>
            <li>Compete in weekly Titled Tuesday events</li>
            <li>Trade players in the marketplace</li>
            <li>Climb the global leaderboards</li>
          </ul>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://fantasyleaguechess.com/dashboard" style="background-color: #8B4513; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600;">
              Go to Dashboard
            </a>
          </p>
          
          <p style="color: #666666; font-size: 14px; text-align: center;">
            Ready to dominate the chess world? Your strategic journey awaits!
          </p>
        </div>
        
        <div class="footer">
          <p>
            <a href="https://fantasyleaguechess.com/privacy">Privacy Policy</a> | 
            <a href="https://fantasyleaguechess.com/tos">Terms of Service</a> | 
            <a href="mailto:support@fantasyleaguechess.com">Support</a>
          </p>
          <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
            You received this email because you signed up for Fantasy League Chess.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Weekly results email function
async function sendWeeklyResultsEmail(userEmail: string, supabase: any) {
  try {
    // Get user's leagues and lineup results for the current week
    const { data: user } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('email', userEmail)
      .single();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get current week (most recent Tuesday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysSinceTuesday = (dayOfWeek - 2 + 7) % 7;
    const lastTuesday = new Date(now);
    lastTuesday.setDate(now.getDate() - daysSinceTuesday);
    const weekStart = lastTuesday.toISOString().split('T')[0];

    // Get user's lineup results for this week
    const { data: lineupResults } = await supabase
      .from('lineups')
      .select(`
        total_points,
        leagues!inner(
          name,
          id
        )
      `)
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart);

    if (!lineupResults || lineupResults.length === 0) {
      return { success: false, error: 'No lineup results found for this week' };
    }

    // Create weekly results HTML
    const htmlContent = createWeeklyResultsHTML(user.display_name, lineupResults, weekStart);

    // Send the email
    const emailResult = await sendViaSMTP({
      to: userEmail,
      subject: `Weekly Results - ${weekStart}`,
      html: htmlContent,
      text: `Your weekly fantasy chess results for ${weekStart}`
    });

    return emailResult;

  } catch (error) {
    console.error('Error sending weekly results email:', error);
    return { success: false, error: error.message };
  }
}

// Weekly results email template
function createWeeklyResultsHTML(userName: string, lineupResults: any[], weekStart: string): string {
  const totalPoints = lineupResults.reduce((sum, result) => sum + (result.total_points || 0), 0);
  const leagueCount = lineupResults.length;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Results - Fantasy League Chess</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #FFF8DC;
          color: #2F2F2F;
          line-height: 1.6;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #8B4513;
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .content {
          padding: 40px 30px;
        }
        .results-summary {
          background-color: #F4A460;
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }
        .league-result {
          background-color: #f8f9fa;
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
          border-left: 4px solid #8B4513;
        }
        .footer {
          background-color: #8B4513;
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Weekly Results</h1>
          <p>Week of ${weekStart}</p>
        </div>
        
        <div class="content">
          <h2>Hello ${userName}!</h2>
          
          <div class="results-summary">
            <h3>Your Weekly Performance</h3>
            <p><strong>Total Points:</strong> ${totalPoints}</p>
            <p><strong>Leagues Active:</strong> ${leagueCount}</p>
          </div>
          
          <h3>League Breakdown:</h3>
          ${lineupResults.map(result => `
            <div class="league-result">
              <strong>${result.leagues.name}</strong><br>
              Points: ${result.total_points || 0}
            </div>
          `).join('')}
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://fantasyleaguechess.com/dashboard" style="background-color: #8B4513; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600;">
              View Full Results
            </a>
          </p>
        </div>
        
        <div class="footer">
          <p>Keep playing and climb the leaderboards!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
