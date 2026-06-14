import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Most recent Titled Tuesday (calendar date in US Eastern). */
function getEasternTuesdayDate(reference = new Date()): string {
  const easternToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(reference)

  const [year, month, day] = easternToday.split('-').map(Number)
  const cursor = new Date(Date.UTC(year, month - 1, day))
  const daysSinceTuesday = (cursor.getUTCDay() - 2 + 7) % 7
  cursor.setUTCDate(cursor.getUTCDate() - daysSinceTuesday)
  return cursor.toISOString().slice(0, 10)
}

function parseWeekDate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const weekDate = (body as { week_date?: unknown }).week_date
  if (typeof weekDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekDate)) {
    return null
  }
  return weekDate
}

function parseTestEmail(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const testEmail = (body as { test_email?: unknown }).test_email
  if (typeof testEmail !== 'string' || !testEmail.trim()) {
    return null
  }
  return testEmail.trim().toLowerCase()
}

const dashboardUrl = 'https://fantasyleaguechess.com/dashboard'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatPoints(value: unknown): string {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue.toFixed(2) : '0.00'
}

function createWeeklyResultsEmail(user: any, lineups: any[], leagueById: Map<string, any>, tradesByLeagueId: Map<string, any[]>, tuesdayDate: string) {
  const displayName = user.username || user.display_name || user.email?.split('@')[0] || 'there'
  const totalPoints = lineups.reduce((sum, lineup) => sum + Number(lineup.total_points || 0), 0)
  const leagueRows = lineups
    .map((lineup) => {
      const league = leagueById.get(lineup.league_id)
      return `
        <tr>
          <td style="padding: 12px; border-top: 1px solid #e5e7eb;">${escapeHtml(league?.name || 'League')}</td>
          <td style="padding: 12px; border-top: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${formatPoints(lineup.total_points)}</td>
        </tr>
      `
    })
    .join('')

  const userTrades = lineups.flatMap((lineup) => tradesByLeagueId.get(lineup.league_id) || [])
  const tradeRows = userTrades.length
    ? userTrades
        .map((trade) => `
          <li style="margin-bottom: 8px;">
            ${escapeHtml(trade.buyerName)} acquired ${escapeHtml(trade.playerName)} from ${escapeHtml(trade.sellerName)}
            for ${escapeHtml(trade.price)} coins in ${escapeHtml(trade.leagueName)}.
          </li>
        `)
        .join('')
    : '<li>No accepted trades were recorded for your leagues this week.</li>'

  const textContent = [
    `Hi ${displayName},`,
    `Here are your Fantasy League Chess results for Titled Tuesday ${tuesdayDate}.`,
    ...lineups.map((lineup) => `${leagueById.get(lineup.league_id)?.name || 'League'}: ${formatPoints(lineup.total_points)} points`),
    `Total points: ${formatPoints(totalPoints)}`,
    'Trade updates:',
    ...(userTrades.length
      ? userTrades.map((trade) => `${trade.buyerName} acquired ${trade.playerName} from ${trade.sellerName} for ${trade.price} coins in ${trade.leagueName}.`)
      : ['No accepted trades were recorded for your leagues this week.']),
    `View your dashboard: ${dashboardUrl}`,
  ].join('\n\n')

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="https://fantasyleaguechess.com/assets/fantasy-league-chess-logo-updated.png" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Your Weekly Fantasy Chess Results</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi ${escapeHtml(displayName)},</p>
            <p style="margin: 0 0 18px;">Here are your Fantasy League Chess results for Titled Tuesday ${escapeHtml(tuesdayDate)}.</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 22px 0; text-align: center;">
              <div style="font-size: 13px; color: #166534; font-weight: 700; text-transform: uppercase;">Total Fantasy Points</div>
              <div style="font-size: 32px; color: #166534; font-weight: 800;">${formatPoints(totalPoints)}</div>
            </div>
            <h2 style="font-size: 18px; margin: 24px 0 10px; color: #1f2937;">League Results</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tbody>${leagueRows}</tbody>
            </table>
            <h2 style="font-size: 18px; margin: 24px 0 10px; color: #1f2937;">Trade Updates</h2>
            <ul style="padding-left: 20px; margin: 0 0 24px;">${tradeRows}</ul>
            <p style="margin: 30px 0; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">View Dashboard</a>
            </p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #777777; padding: 0 24px 24px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Fantasy League Chess. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `

  return {
    subject: `Your Fantasy League Chess results for ${tuesdayDate}`,
    htmlContent,
    textContent,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let requestBody: unknown = null
    let tuesdayDate = getEasternTuesdayDate()
    let testEmail: string | null = null
    try {
      requestBody = await req.json()
      const requested = parseWeekDate(requestBody)
      if (requested) {
        tuesdayDate = requested
      }
      testEmail = parseTestEmail(requestBody)
    } catch {
      // No JSON body — use Eastern Tuesday
    }

    const monday = new Date(`${tuesdayDate}T12:00:00Z`)
    monday.setUTCDate(monday.getUTCDate() - 1)
    const lineupWeekStart = monday.toISOString().slice(0, 10)

    console.log(`Scoring lineups for TT ${tuesdayDate} (lineups.week_start_date=${lineupWeekStart})`)

    const { error } = await supabase.rpc('process_weekly_results', {
      week_date: tuesdayDate,
    })

    if (error) {
      console.error('Error processing weekly results:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let emailsSent = 0
    try {
      const { data: lineupsWithResults, error: lineupsError } = await supabase
        .from('lineups')
        .select('user_id, league_id, total_points')
        .eq('week_start_date', lineupWeekStart)
        .not('total_points', 'is', null)
        .not('user_id', 'is', null)

      if (lineupsError) {
        console.error('Error fetching lineups with results:', lineupsError)
      } else if (lineupsWithResults?.length) {
        const userIds = Array.from(new Set(lineupsWithResults.map((lineup) => lineup.user_id).filter(Boolean)))
        const leagueIds = Array.from(new Set(lineupsWithResults.map((lineup) => lineup.league_id).filter(Boolean)))
        const { data: usersWithResults, error: usersError } = await supabase
          .from('users')
          .select('id, email, username, display_name')
          .in('id', userIds)

        if (usersError) {
          console.error('Error fetching users with results:', usersError)
        } else {
          const [{ data: leagues }, { data: trades }] = await Promise.all([
            supabase
              .from('leagues')
              .select('id, name')
              .in('id', leagueIds),
            supabase
              .from('trades')
              .select('league_id, seller_id, buyer_id, player_id, price, accepted_at')
              .eq('status', 'accepted')
              .gte('accepted_at', `${lineupWeekStart}T00:00:00Z`)
              .in('league_id', leagueIds),
          ])
          const tradeUserIds = Array.from(new Set((trades || []).flatMap((trade) => [trade.seller_id, trade.buyer_id]).filter(Boolean)))
          const tradePlayerIds = Array.from(new Set((trades || []).map((trade) => trade.player_id).filter(Boolean)))
          const [{ data: tradeUsers }, { data: tradePlayers }] = await Promise.all([
            tradeUserIds.length
              ? supabase.from('users').select('id, username, display_name, email').in('id', tradeUserIds)
              : Promise.resolve({ data: [] }),
            tradePlayerIds.length
              ? supabase.from('chess_players').select('id, name').in('id', tradePlayerIds)
              : Promise.resolve({ data: [] }),
          ])
          const leagueById = new Map<string, any>((leagues || []).map((league: any) => [league.id, league]))
          const tradeUserById = new Map<string, any>((tradeUsers || []).map((user: any) => [user.id, user]))
          const playerById = new Map<string, any>((tradePlayers || []).map((player: any) => [player.id, player]))
          const tradesByLeagueId = new Map<string, any[]>()

          for (const trade of trades || []) {
            const league = leagueById.get(trade.league_id)
            const seller = tradeUserById.get(trade.seller_id)
            const buyer = tradeUserById.get(trade.buyer_id)
            const player = playerById.get(trade.player_id)
            const formattedTrade = {
              leagueName: league?.name || 'League',
              sellerName: seller?.username || seller?.display_name || seller?.email || 'another manager',
              buyerName: buyer?.username || buyer?.display_name || buyer?.email || 'another manager',
              playerName: player?.name || 'a player',
              price: trade.price,
            }
            const existing = tradesByLeagueId.get(trade.league_id) || []
            existing.push(formattedTrade)
            tradesByLeagueId.set(trade.league_id, existing)
          }

          const emailRecipients = testEmail
            ? (usersWithResults || []).filter((user) => user.email?.toLowerCase() === testEmail)
            : (usersWithResults || [])

          console.log(`Sending weekly results emails to ${emailRecipients.length} users${testEmail ? ` (test_email=${testEmail})` : ''}`)

          for (const user of emailRecipients) {
            if (!user.email) continue
            const userLineups = lineupsWithResults.filter((lineup) => lineup.user_id === user.id)
            const { subject, htmlContent, textContent } = createWeeklyResultsEmail(user, userLineups, leagueById, tradesByLeagueId, tuesdayDate)
            try {
              await supabase.functions.invoke('send-free-email', {
                body: {
                  to: user.email,
                  subject,
                  htmlContent,
                  textContent,
                  emailType: 'custom',
                  userEmail: user.email,
                  userId: user.id,
                  metadata: {
                    source: 'process_weekly_results',
                    weekDate: tuesdayDate,
                    lineupWeekStart,
                  },
                },
              })
              emailsSent += 1
              console.log(`Weekly results email sent to ${user.email}`)
            } catch (emailError) {
              console.error(`Error sending email to ${user.email}:`, emailError)
            }
          }
        }
      }
    } catch (emailError) {
      console.error('Error in email sending process:', emailError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: tuesdayDate,
        lineup_week_start: lineupWeekStart,
        message: `Processed weekly results for ${tuesdayDate}`,
        emailsSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
