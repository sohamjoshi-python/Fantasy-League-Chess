import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getSecretKey } from '../_shared/supabaseKeys.ts'
import { GENERIC_ERROR, logServerError } from '../_shared/publicError.ts'

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

function createTradeAcceptedEmailContent({
  recipientName,
  playerName,
  playerElo,
  sellerName,
  buyerName,
  leagueName,
  price,
  tradeUrl,
}: {
  recipientName: string
  playerName: string
  playerElo?: number
  sellerName: string
  buyerName: string
  leagueName: string
  price: number
  tradeUrl: string
}) {
  const eloText = typeof playerElo === 'number' ? `ELO ${playerElo}` : 'ELO unavailable'
  const headline = `${playerName} is no longer available and has been sold to ${buyerName}.`
  const detail = `${sellerName} sold ${playerName} to ${buyerName} for ${price} coins in ${leagueName}.`

  const textContent = [
    `Hi ${recipientName},`,
    headline,
    detail,
    `Player: ${playerName} (${eloText})`,
    `League: ${leagueName}`,
    `Price: ${price} coins`,
    `View league: ${tradeUrl}`,
  ].join('\n\n')

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="https://fantasyleaguechess.com/assets/fantasy-league-chess-logo-updated.png" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Trade Completed</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi ${escapeHtml(recipientName)},</p>
            <p style="margin: 0 0 18px;">${escapeHtml(headline)}</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0 0 8px;"><strong>League:</strong> ${escapeHtml(leagueName)}</p>
              <p style="margin: 0 0 8px;"><strong>Player:</strong> ${escapeHtml(playerName)} (${escapeHtml(eloText)})</p>
              <p style="margin: 0 0 8px;"><strong>Seller:</strong> ${escapeHtml(sellerName)}</p>
              <p style="margin: 0 0 8px;"><strong>Buyer:</strong> ${escapeHtml(buyerName)}</p>
              <p style="margin: 0;"><strong>Final price:</strong> ${price} coins</p>
            </div>
            <p style="margin: 30px 0; text-align: center;">
              <a href="${tradeUrl}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">View League</a>
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
    const supabaseServiceKey = getSecretKey()
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('id, league_id, seller_id, buyer_id, player_id, price, status')
      .eq('id', tradeId)
      .single()

    if (tradeError || !trade) {
      throw tradeError || new Error('Trade not found')
    }

    if (trade.status !== 'accepted' || !trade.buyer_id) {
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, message: 'Trade is not accepted yet.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const [{ data: league, error: leagueError }, { data: player, error: playerError }, { data: users, error: usersError }] = await Promise.all([
      supabase.from('leagues').select('id, name, member_ids').eq('id', trade.league_id).single(),
      supabase.from('chess_players').select('id, name, elo').eq('id', trade.player_id).single(),
      supabase.from('users').select('id, email, username').in('id', [trade.seller_id, trade.buyer_id]),
    ])

    if (leagueError || playerError || usersError || !league || !player) {
      throw leagueError || playerError || usersError || new Error('Missing accepted trade email details')
    }

    const userById = new Map((users || []).map((user: any) => [user.id, user]))
    const seller = userById.get(trade.seller_id)
    const buyer = userById.get(trade.buyer_id)
    const sellerName = seller?.username || seller?.email || 'another manager'
    const buyerName = buyer?.username || buyer?.email || 'another manager'
    const memberIds = Array.from(new Set([...(league.member_ids || []), trade.seller_id, trade.buyer_id]))
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, email, username')
      .in('id', memberIds)

    if (membersError) {
      throw membersError
    }

    const playerName = player.name || 'A player'
    const tradeUrl = `${siteUrl}/league/${trade.league_id}`
    const subject = `${playerName} was sold in ${league.name}`
    let emailsSent = 0
    const emailErrors: string[] = []

    for (const member of members || []) {
      if (!member.email) continue

      const { htmlContent, textContent } = createTradeAcceptedEmailContent({
        recipientName: member.username || member.email.split('@')[0] || 'there',
        playerName,
        playerElo: player.elo,
        sellerName,
        buyerName,
        leagueName: league.name,
        price: trade.price,
        tradeUrl,
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
            source: 'trade_accepted',
            tradeId: trade.id,
            playerId: trade.player_id,
            sellerId: trade.seller_id,
            buyerId: trade.buyer_id,
          },
        },
      })

      if (error) {
        logServerError('notify-trade-accepted', error)
        emailErrors.push('Could not send email')
      } else {
        emailsSent += 1
      }
    }

    return new Response(
      JSON.stringify({ success: emailErrors.length === 0, emailsSent, emailErrors }),
      { status: emailErrors.length === 0 ? 200 : 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    logServerError('notify-trade-accepted', error)
    return new Response(
      JSON.stringify({ success: false, error: GENERIC_ERROR }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
