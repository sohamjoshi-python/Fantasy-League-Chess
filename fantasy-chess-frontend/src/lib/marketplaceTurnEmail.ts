import { supabase } from './supabase'
import { MARKETPLACE_TURN_TIMEOUT_HOURS } from './leagueStatus'

const SITE_URL = 'https://fantasyleaguechess.com'
const LOGO_URL = `${SITE_URL}/assets/fantasy-league-chess-logo-updated.png`

type MarketplaceTurnEmailClaim = {
  league_id: string
  league_name: string | null
  turn_number: number | null
  user_id: string
  email: string
  username: string | null
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function createMarketplaceTurnEmail(recipientName: string, leagueName: string, leagueId: string) {
  const leagueUrl = `${SITE_URL}/league/${leagueId}`
  const subject = `Your turn to draft in ${leagueName}`
  const textContent = [
    `Hi ${recipientName},`,
    `It's your turn to pick in the draft for ${leagueName}.`,
    `You have ${MARKETPLACE_TURN_TIMEOUT_HOURS} hours to buy a player. If you don't pick, this turn is skipped and you can still add players later in the regular marketplace.`,
    `Make your pick: ${leagueUrl}`,
  ].join('\n\n')
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="${LOGO_URL}" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Your Turn To Draft</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi ${escapeHtml(recipientName)},</p>
            <p style="margin: 0 0 18px;">It's your turn to pick in the draft for <strong>${escapeHtml(leagueName)}</strong>.</p>
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0;"><strong>You have ${MARKETPLACE_TURN_TIMEOUT_HOURS} hours</strong> to buy a player. If you don't pick, this turn is skipped.</p>
            </div>
            <p style="margin: 0 0 24px;">You can still add players later in the regular marketplace after the snake draft ends.</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="${leagueUrl}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Make Your Pick</a>
            </p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #777777; padding: 0 24px 24px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Fantasy League Chess. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
  return { subject, htmlContent, textContent }
}

/** Claim and email the current picker once per turn. Safe to call on every turn change. */
export async function notifyMarketplaceTurnIfNeeded(leagueId: string): Promise<void> {
  if (!leagueId) return

  try {
    const { data, error } = await supabase.rpc('claim_marketplace_turn_emails', {
      p_league_id: leagueId,
    })

    if (error) {
      console.error('Error claiming marketplace turn emails:', error)
      return
    }

    const recipients = (data || []) as MarketplaceTurnEmailClaim[]
    for (const recipient of recipients) {
      if (!recipient.email) continue
      const name = recipient.username || recipient.email.split('@')[0] || 'there'
      const leagueName = recipient.league_name || 'your league'
      const payload = createMarketplaceTurnEmail(name, leagueName, recipient.league_id)
      const { error: emailError } = await supabase.functions.invoke('send-resend-email', {
        body: {
          to: recipient.email,
          subject: payload.subject,
          htmlContent: payload.htmlContent,
          textContent: payload.textContent,
          emailType: 'custom',
          userId: recipient.user_id,
          leagueId: recipient.league_id,
          metadata: {
            source: 'marketplace_turn',
            turnNumber: recipient.turn_number,
          },
        },
      })
      if (emailError) {
        console.error('Error sending marketplace turn email:', emailError)
      }
    }
  } catch (error) {
    console.error('Error notifying marketplace turn:', error)
  }
}
