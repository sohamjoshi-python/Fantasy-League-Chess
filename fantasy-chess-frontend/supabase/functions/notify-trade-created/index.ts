import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const siteUrl = 'https://fantasyleaguechess.com'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatTradeTimeLeft(expiresAt: Date) {
  const millisecondsLeft = expiresAt.getTime() - Date.now()
  if (!Number.isFinite(millisecondsLeft) || millisecondsLeft <= 0) {
    return 'less than 1 hour'
  }

  const hoursLeft = Math.ceil(millisecondsLeft / (1000 * 60 * 60))
  const days = Math.floor(hoursLeft / 24)
  const hours = hoursLeft % 24

  if (days > 0 && hours > 0) {
    return `${days} day${days === 1 ? '' : 's'} and ${hours} hour${hours === 1 ? '' : 's'}`
  }

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'}`
  }

  return `${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}`
}

function createTradeListedEmailContent({
  recipientName,
  playerName,
  playerElo,
  sellerDescription,
  leagueName,
  price,
  timeLeft,
  expiresAt,
  tradeUrl,
  recipientIsSeller,
}: {
  recipientName: string
  playerName: string
  playerElo?: number
  sellerDescription: string
  leagueName: string
  price: number
  timeLeft: string
  expiresAt: Date
  tradeUrl: string
  recipientIsSeller: boolean
}) {
  const headline = recipientIsSeller
    ? `${playerName} was listed for trade by you.`
    : `${playerName} is being traded by ${sellerDescription}.`
  const actionText = recipientIsSeller
    ? 'You can view or cancel the listing from the league marketplace.'
    : 'Open the league marketplace to buy this player before the listing expires.'
  const expiresText = expiresAt.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const eloText = typeof playerElo === 'number' ? `ELO ${playerElo}` : 'ELO unavailable'

  const textContent = [
    `Hi ${recipientName},`,
    headline,
    `League: ${leagueName}`,
    `Player: ${playerName} (${eloText})`,
    `Price: ${price} coins`,
    `Time left: ${timeLeft}`,
    `Expires: ${expiresText}`,
    actionText,
    `Open trade: ${tradeUrl}`,
  ].join('\n\n')

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="https://fantasyleaguechess.com/assets/fantasy-league-chess-logo-updated.png" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">New Trade Listing</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi ${escapeHtml(recipientName)},</p>
            <p style="margin: 0 0 18px;">${escapeHtml(headline)}</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0 0 8px;"><strong>League:</strong> ${escapeHtml(leagueName)}</p>
              <p style="margin: 0 0 8px;"><strong>Player:</strong> ${escapeHtml(playerName)} (${escapeHtml(eloText)})</p>
              <p style="margin: 0 0 8px;"><strong>Price:</strong> ${price} coins</p>
              <p style="margin: 0;"><strong>Time left:</strong> ${escapeHtml(timeLeft)} (expires ${escapeHtml(expiresText)})</p>
            </div>
            <p style="margin: 0 0 24px;">${escapeHtml(actionText)}</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="${tradeUrl}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Open Trade</a>
            </p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #777777; padding: 0 24px 24px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Fantasy League Chess. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `

  return { htmlContent, textContent }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tradeId } = await req.json()

    if (!tradeId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing tradeId.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('id, league_id, seller_id, player_id, price, expires_at, status')
      .eq('id', tradeId)
      .single()

    if (tradeError || !trade) {
      throw tradeError || new Error('Trade not found')
    }

    if (trade.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, message: 'Trade is no longer pending.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const [{ data: league, error: leagueError }, { data: player, error: playerError }, { data: seller, error: sellerError }] = await Promise.all([
      supabase.from('leagues').select('id, name, member_ids').eq('id', trade.league_id).single(),
      supabase.from('chess_players').select('id, name, elo').eq('id', trade.player_id).single(),
      supabase.from('users').select('id, email, username').eq('id', trade.seller_id).single(),
    ])

    if (leagueError || playerError || sellerError || !league || !player || !seller) {
      throw leagueError || playerError || sellerError || new Error('Missing trade email details')
    }

    const memberIds = Array.from(new Set([...(league.member_ids || []), trade.seller_id]))
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, email, username')
      .in('id', memberIds)

    if (membersError) {
      throw membersError
    }

    const tradeUrl = `${siteUrl}/league/${trade.league_id}`
    const expiresAt = new Date(trade.expires_at)
    const timeLeft = formatTradeTimeLeft(expiresAt)
    const sellerName = seller.username || seller.email || 'A league member'
    const playerName = player.name || 'A player'
    const subject = `${playerName} is available in ${league.name}`
    let emailsSent = 0
    const emailErrors: string[] = []

    for (const member of members || []) {
      if (!member.email) continue

      const recipientIsSeller = member.id === trade.seller_id
      const sellerDescription = recipientIsSeller ? 'you' : sellerName
      const { htmlContent, textContent } = createTradeListedEmailContent({
        recipientName: member.username || member.email.split('@')[0] || 'there',
        playerName,
        playerElo: player.elo,
        sellerDescription,
        leagueName: league.name,
        price: trade.price,
        timeLeft,
        expiresAt,
        tradeUrl,
        recipientIsSeller,
      })

      const { error } = await supabase.functions.invoke('send-resend-email', {
        body: {
          to: member.email,
          subject,
          htmlContent,
          textContent,
          emailType: 'custom',
          userId: member.id,
          leagueId: trade.league_id,
          metadata: {
            source: 'trade_created',
            tradeId: trade.id,
            playerId: trade.player_id,
            sellerId: trade.seller_id,
            recipientIsSeller,
          },
        },
      })

      if (error) {
        emailErrors.push(`${member.email}: ${error.message}`)
      } else {
        emailsSent += 1
      }
    }

    return new Response(
      JSON.stringify({ success: emailErrors.length === 0, emailsSent, emailErrors }),
      { status: emailErrors.length === 0 ? 200 : 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('notify-trade-created error:', error)
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
