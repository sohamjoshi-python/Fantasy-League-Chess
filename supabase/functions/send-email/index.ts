import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function withCorsHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function createWelcomeEmailHTML() {
  const primaryColor = "#8B4513";
  const secondaryColor = "#D2691E";
  const accentColor = "#F4A460";
  const backgroundColor = "#FFF8DC";
  const textColor = "#2F2F2F";
  const lightText = "#666666";

  const logoHTML = `
    <div style="font-size: 48px; font-weight: bold; color: white; margin-bottom: 15px;">
      ♔ Fantasy League Chess ♔
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fantasy League Chess - Fantasy Chess</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: ${backgroundColor};
          color: ${textColor};
          line-height: 1.6;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
        }
        .welcome-section {
          text-align: center;
          margin-bottom: 30px;
        }
        .welcome-section h2 {
          color: ${primaryColor};
          font-size: 24px;
          margin-bottom: 15px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .footer {
          background-color: ${primaryColor};
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 14px;
        }
        .footer a {
          color: ${accentColor};
          text-decoration: none;
        }
        .highlight {
          background-color: ${accentColor};
          color: white;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }
        .feature-list {
          list-style: none;
          padding: 0;
        }
        .feature-list li {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .feature-list li:before {
          content: "♔";
          color: ${primaryColor};
          font-weight: bold;
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          ${logoHTML}
          <h1>Fantasy League Chess</h1>
          <p>Fantasy Chess League</p>
        </div>
        
        <div class="content">
          <div class="welcome-section">
            <h2>Welcome to Fantasy League Chess! 🎯</h2>
            <p>Your fantasy chess adventure begins now. Compete with the world's best players and prove your strategic mastery.</p>
          </div>
          
          <div class="highlight">
            <strong>🎉 Your League is Ready!</strong><br>
            Start building your dream team and competing in weekly tournaments
          </div>
          
          <h3 style="color: ${primaryColor}; margin-top: 30px;">🏆 What Makes Fantasy League Chess Special</h3>
          <ul class="feature-list">
            <li><strong>Individual Baseline Scoring:</strong> Compete against your own historical performance</li>
            <li><strong>Real Titled Tuesday Data:</strong> Use actual games from top players</li>
            <li><strong>Dynamic Market:</strong> Buy, sell, and trade players strategically</li>
            <li><strong>Weekly Tournaments:</strong> Compete in regular leagues</li>
          </ul>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="https://pawn-royale.vercel.app" class="cta-button">
              🚀 Start Playing Now
            </a>
          </div>
          
          <p style="color: ${lightText}; font-size: 14px; text-align: center;">
            Ready to dominate the chess world? Your strategic journey awaits!
          </p>
        </div>
        
        <div class="footer">
          <p>
            <a href="https://pawn-royale.vercel.app/privacy">Privacy Policy</a> | 
            <a href="https://pawn-royale.vercel.app/tos">Terms of Service</a> | 
            <a href="mailto:support@pawnroyale.com">Support</a>
          </p>
          <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
            You received this email because you signed up for Fantasy League Chess.<br>
            <a href="#" style="color: ${accentColor};">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createWeeklyResultsEmailHTML(userEmail: string, leagueData: any, lineupResults: any[], teamPlayers: any[]) {
  const primaryColor = "#8B4513";
  const secondaryColor = "#D2691E";
  const accentColor = "#F4A460";
  const backgroundColor = "#FFF8DC";
  const textColor = "#2F2F2F";
  const lightText = "#666666";

  // Get user's lineup
  const userLineup = lineupResults.find(lineup => lineup.users?.email === userEmail);
  if (!userLineup) return null;

  // Get week info
  const weekStart = new Date(userLineup.week_start_date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  // Calculate league rank
  const sortedLineups = lineupResults.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
  const userRank = sortedLineups.findIndex(lineup => lineup.users?.email === userEmail) + 1;
  const totalPlayers = lineupResults.length;

  const logoHTML = `
    <div style="font-size: 48px; font-weight: bold; color: white; margin-bottom: 15px;">
      ♔ Fantasy League Chess ♔
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fantasy League Chess - Weekly Results</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: ${backgroundColor};
          color: ${textColor};
          line-height: 1.6;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
        }
        .week-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .week-header h2 {
          color: ${primaryColor};
          font-size: 24px;
          margin-bottom: 10px;
        }
        .stats-container {
          background-color: #f8f9fa;
          border-radius: 10px;
          padding: 25px;
          margin: 25px 0;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .stat-row:last-child {
          border-bottom: none;
        }
        .stat-label {
          font-weight: 600;
          color: ${primaryColor};
        }
        .stat-value {
          font-weight: bold;
          font-size: 18px;
        }
        .player-performance {
          background: linear-gradient(135deg, ${accentColor}, ${secondaryColor});
          color: white;
          padding: 20px;
          border-radius: 10px;
          margin: 25px 0;
        }
        .player-performance h3 {
          margin: 0 0 15px 0;
          font-size: 20px;
        }
        .performance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        .performance-item {
          text-align: center;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        .performance-number {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .performance-label {
          font-size: 12px;
          opacity: 0.9;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .footer {
          background-color: ${primaryColor};
          color: white;
          padding: 20px;
          text-align: center;
          font-size: 14px;
        }
        .footer a {
          color: ${accentColor};
          text-decoration: none;
        }
        .highlight {
          background-color: ${accentColor};
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
          ${logoHTML}
          <h1>Fantasy League Chess</h1>
          <p>Weekly Fantasy Chess Results</p>
        </div>
        
        <div class="content">
          <div class="week-header">
            <h2>📊 Your Weekly Results</h2>
            <p>${weekRange}</p>
            <p><strong>League:</strong> ${leagueData.leagues.name}</p>
          </div>
          
          <div class="highlight">
            <strong>🎯 Your Performance Summary</strong><br>
            Real results from your fantasy chess lineup
          </div>
          
          <div class="stats-container">
            <h3 style="color: ${primaryColor}; margin-top: 0;">📈 League Performance</h3>
            <div class="stat-row">
              <span class="stat-label">Total Fantasy Points:</span>
              <span class="stat-value">${userLineup.total_points?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">League Rank:</span>
              <span class="stat-value">#${userRank} of ${totalPlayers}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Week Period:</span>
              <span class="stat-value">${weekRange}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="https://pawn-royale.vercel.app/league" class="cta-button">
              📊 View Full Results
            </a>
          </div>
          
          <p style="color: ${lightText}; font-size: 14px; text-align: center;">
            Keep up the great work! Your strategic decisions are paying off.
          </p>
        </div>
        
        <div class="footer">
          <p>
            <a href="https://pawn-royale.vercel.app/privacy">Privacy Policy</a> | 
            <a href="https://pawn-royale.vercel.app/tos">Terms of Service</a> | 
            <a href="mailto:support@pawnroyale.com">Support</a>
          </p>
          <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
            You received this email because you signed up for Fantasy League Chess.<br>
            <a href="#" style="color: ${accentColor};">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendWeeklyResultsEmail(userEmail: string) {
  try {
    // Get user's leagues
    const { data: userResponse } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (!userResponse) {
      throw new Error(`User not found with email: ${userEmail}`);
    }

    const userId = userResponse.id;

    // Get user's leagues
    const { data: userLeagues } = await supabase
      .from('league_members')
      .select(`
        league_id,
        leagues!inner(
          id,
          name,
          start_date,
          end_date
        )
      `)
      .eq('user_id', userId);

    if (!userLeagues || userLeagues.length === 0) {
      throw new Error('No leagues found for user');
    }

    // Process each league
    for (const leagueMember of userLeagues) {
      const leagueId = leagueMember.league_id;
      const leagueName = leagueMember.leagues.name;

      // Get the most recent week with results (for now, use a specific week)
      const weekStartDate = '2025-07-21'; // You can make this dynamic

      // Get lineup results for the week
      const { data: lineupsResponse } = await supabase
        .from('lineups')
        .select('id, user_id, total_points, week_start_date')
        .eq('league_id', leagueId)
        .eq('week_start_date', weekStartDate);

      if (!lineupsResponse || lineupsResponse.length === 0) {
        console.log(`No lineup results found for week ${weekStartDate}`);
        continue;
      }

      // Get user information for each lineup
      const lineupResults = [];
      for (const lineup of lineupsResponse) {
        const { data: userData } = await supabase
          .from('users')
          .select('email, username')
          .eq('id', lineup.user_id)
          .single();

        if (userData) {
          lineupResults.push({
            ...lineup,
            users: userData
          });
        }
      }

      // Get user's team players
      const { data: teamResponse } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('user_id', userId)
        .eq('league_id', leagueId)
        .single();

      let teamPlayers = [];
      if (teamResponse && teamResponse.player_ids) {
        const { data: playersResponse } = await supabase
          .from('chess_players')
          .select('id, name, elo')
          .in('id', teamResponse.player_ids);

        teamPlayers = playersResponse || [];
      }

      // Create personalized email
      const htmlContent = createWeeklyResultsEmailHTML(userEmail, leagueMember, lineupResults, teamPlayers);

      if (htmlContent) {
        // Send the email
        const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
        const FROM_EMAIL = 'no-reply@fantasyleaguechess.com';

        if (!SENDGRID_API_KEY) {
          throw new Error('Missing SENDGRID_API_KEY');
        }

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: userEmail }],
              subject: '📊 Your Fantasy League Chess Weekly Results'
            }],
            from: { email: FROM_EMAIL, name: 'Fantasy League Chess' },
            content: [{
              type: 'text/html',
              value: htmlContent
            }]
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to send email: ${error}`);
        }

        console.log(`Weekly results email sent for league: ${leagueName}`);
      }
    }

    return { success: true, message: 'Weekly results emails sent successfully' };

  } catch (error) {
    console.error('Error sending weekly results email:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }

  try {
    const { to, subject, text, emailType, userEmail } = await req.json();
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const FROM_EMAIL = 'no-reply@fantasyleaguechess.com';

    if (!SENDGRID_API_KEY) {
      return withCorsHeaders(new Response('Missing SENDGRID_API_KEY', { status: 500 }));
    }

    let htmlContent = '';
    let emailSubject = subject;

    // Handle different email types
    if (emailType === 'welcome') {
      htmlContent = createWelcomeEmailHTML();
      emailSubject = '🎯 Welcome to Fantasy League Chess - Your Fantasy Chess Adventure Begins!';
    } else if (emailType === 'weekly_results') {
      // Send weekly results email with real data
      const result = await sendWeeklyResultsEmail(userEmail || to);
      return withCorsHeaders(new Response(JSON.stringify(result), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    } else {
      // Default plain text email
      htmlContent = `<html><body><p>${text}</p></body></html>`;
    }

    // Send the email
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: 'Fantasy League Chess' },
        subject: emailSubject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return withCorsHeaders(new Response(`Failed to send email: ${error}`, { status: 500 }));
    }

    return withCorsHeaders(new Response('Email sent!', { status: 200 }));
  } catch (err) {
    return withCorsHeaders(new Response('Error: ' + (err?.message || err), { status: 500 }));
  }
}); 