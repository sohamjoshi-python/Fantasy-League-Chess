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
    
    // SMTP Configuration (set these in Supabase secrets)
    const SMTP_HOSTNAME = Deno.env.get('SMTP_HOSTNAME');
    const SMTP_PORT = Deno.env.get('SMTP_PORT') || '587';
    const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME');
    const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD');
    const SMTP_FROM = Deno.env.get('SMTP_FROM') || 'noreply@fantasyleaguechess.com';
    const FUNCTION_SECRET = Deno.env.get('FUNCTION_SECRET');

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

    // Send email via SMTP
    const smtpResult = await sendViaSMTP({
      to,
      subject: emailSubject,
      html: htmlContentToSend,
      text: textContent || stripHtml(htmlContentToSend),
      smtpConfig: {
        hostname: SMTP_HOSTNAME,
        port: parseInt(SMTP_PORT),
        username: SMTP_USERNAME,
        password: SMTP_PASSWORD,
        from: SMTP_FROM
      }
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
    } else {
      return withCorsHeaders(new Response(JSON.stringify({ 
        error: 'Failed to send email via SMTP: ' + smtpResult.error 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

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

// SMTP sending function using Deno's built-in SMTP support
async function sendViaSMTP({ to, subject, html, text, smtpConfig }: {
  to: string;
  subject: string;
  html: string;
  text: string;
  smtpConfig: {
    hostname: string | undefined;
    port: number;
    username: string | undefined;
    password: string | undefined;
    from: string;
  };
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if SMTP is configured
    if (!smtpConfig.hostname || !smtpConfig.username || !smtpConfig.password) {
      console.log('📧 SMTP not configured - logging email instead:');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('HTML:', html.substring(0, 200) + '...');
      
      return { success: true, messageId: `logged_${Date.now()}` };
    }

    // Use Deno's built-in SMTP support
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Create SMTP connection
    const conn = await Deno.connect({
      hostname: smtpConfig.hostname,
      port: smtpConfig.port,
    });

    try {
      // Read welcome message
      const welcome = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('SMTP Welcome:', welcome);

      // Send EHLO command
      await conn.write(encoder.encode(`EHLO ${smtpConfig.hostname}\r\n`));
      const ehloResponse = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('EHLO Response:', ehloResponse);

      // Send AUTH LOGIN
      await conn.write(encoder.encode('AUTH LOGIN\r\n'));
      const authResponse = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('AUTH Response:', authResponse);

      // Send username (base64 encoded)
      const usernameB64 = btoa(smtpConfig.username);
      await conn.write(encoder.encode(`${usernameB64}\r\n`));
      const usernameResponse = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('Username Response:', usernameResponse);

      // Send password (base64 encoded)
      const passwordB64 = btoa(smtpConfig.password);
      await conn.write(encoder.encode(`${passwordB64}\r\n`));
      const passwordResponse = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('Password Response:', passwordResponse);

      // Send MAIL FROM
      await conn.write(encoder.encode(`MAIL FROM:<${smtpConfig.from}>\r\n`));
      const mailFromResponse = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('MAIL FROM Response:', mailFromResponse);

      // Send RCPT TO
      await conn.write(encoder.encode(`RCPT TO:<${to}>\r\n`));
      const rcptToResponse = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('RCPT TO Response:', rcptToResponse);

      // Send DATA
      await conn.write(encoder.encode('DATA\r\n'));
      const dataResponse = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('DATA Response:', dataResponse);

      // Send email headers and body
      const emailData = `From: ${smtpConfig.from}
To: ${to}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

${html}

.
`;

      await conn.write(encoder.encode(emailData));
      const sendResponse = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('Send Response:', sendResponse);

      // Send QUIT
      await conn.write(encoder.encode('QUIT\r\n'));
      const quitResponse = decoder.decode(await conn.read(new Uint8Array(1024)));
      console.log('QUIT Response:', quitResponse);

      return { success: true, messageId: `smtp_${Date.now()}` };

    } finally {
      conn.close();
    }

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

    // Send the email via SMTP
    const smtpResult = await sendViaSMTP({
      to: userEmail,
      subject: `Weekly Results - ${weekStart}`,
      html: htmlContent,
      text: `Your weekly fantasy chess results for ${weekStart}`,
      smtpConfig: {
        hostname: Deno.env.get('SMTP_HOSTNAME'),
        port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
        username: Deno.env.get('SMTP_USERNAME'),
        password: Deno.env.get('SMTP_PASSWORD'),
        from: Deno.env.get('SMTP_FROM') || 'noreply@fantasyleaguechess.com'
      }
    });

    return smtpResult;

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
