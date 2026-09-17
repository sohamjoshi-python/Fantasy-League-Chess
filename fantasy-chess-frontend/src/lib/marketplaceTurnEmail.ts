import { supabase } from './supabase'
import { getMarketplaceTurnTimeoutLabel } from './leagueStatus'

const SITE_URL = 'https://fantasyleaguechess.com'
const LOGO_URL = `${SITE_URL}/assets/fantasy-league-chess-logo-updated.png`
const COPYRIGHT_YEAR = 2026

type LifecycleEmailClaim = {
  league_id: string
  league_name: string | null
  start_date?: string | null
  user_id: string
  email: string
  username: string | null
}

type MarketplaceTurnEmailClaim = LifecycleEmailClaim & {
  turn_number: number | null
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function wrapLeagueEmail(title: string, innerHtml: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="${LOGO_URL}" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">${escapeHtml(title)}</h1>
          </div>
          <div style="padding: 28px 24px;">
            ${innerHtml}
          </div>
          <div style="text-align: center; font-size: 12px; color: #777777; padding: 0 24px 24px;">
            <p style="margin: 0;">&copy; ${COPYRIGHT_YEAR} Fantasy League Chess. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function createMarketplaceTurnEmail(recipientName: string, leagueName: string, leagueId: string) {
  const leagueUrl = `${SITE_URL}/league/${leagueId}`
  const timeoutLabel = getMarketplaceTurnTimeoutLabel(leagueId)
  const subject = `Your turn to draft in ${leagueName}`
  const textContent = [
    `Hi ${recipientName},`,
    `It's your turn to pick in the draft for ${leagueName}.`,
    `You have ${timeoutLabel} to buy a player. If you don't pick, this turn is skipped and you can still add players later in the regular marketplace.`,
    `Make your pick: ${leagueUrl}`,
  ].join('\n\n')
  const htmlContent = wrapLeagueEmail(
    'Your Turn To Draft',
    `
      <p style="margin: 0 0 18px;">Hi ${escapeHtml(recipientName)},</p>
      <p style="margin: 0 0 18px;">It's your turn to pick in the draft for <strong>${escapeHtml(leagueName)}</strong>.</p>
      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px; margin: 22px 0;">
        <p style="margin: 0;"><strong>You have ${escapeHtml(timeoutLabel)}</strong> to buy a player. If you don't pick, this turn is skipped.</p>
      </div>
      <p style="margin: 0 0 24px;">You can still add players later in the regular marketplace after the snake draft ends.</p>
      <p style="margin: 30px 0; text-align: center;">
        <a href="${leagueUrl}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Make Your Pick</a>
      </p>
    `
  )
  return { subject, htmlContent, textContent }
}

export function createMarketplaceStartedEmail(recipientName: string, leagueName: string, leagueId: string) {
  const leagueUrl = `${SITE_URL}/league/${leagueId}`
  const timeoutLabel = getMarketplaceTurnTimeoutLabel(leagueId)
  const subject = `The draft is open in ${leagueName}`
  const textContent = [
    `Hi ${recipientName},`,
    `The snake draft for ${leagueName} has started.`,
    `Managers take turns buying chess players. Each turn has ${timeoutLabel}. If you don't pick, that turn is skipped and you can still add players later in the regular marketplace.`,
    `You'll get another email when it's your turn.`,
    `Open draft: ${leagueUrl}`,
  ].join('\n\n')
  const htmlContent = wrapLeagueEmail(
    'The Draft Is Open',
    `
      <p style="margin: 0 0 18px;">Hi ${escapeHtml(recipientName)},</p>
      <p style="margin: 0 0 18px;">The snake draft for <strong>${escapeHtml(leagueName)}</strong> has started.</p>
      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px; margin: 22px 0;">
        <p style="margin: 0;"><strong>Each turn has ${escapeHtml(timeoutLabel)}.</strong> If you don't pick, that turn is skipped. You'll get an email when it's your turn.</p>
      </div>
      <p style="margin: 0 0 24px;">You can still add players later in the regular marketplace after the snake draft ends.</p>
      <p style="margin: 30px 0; text-align: center;">
        <a href="${leagueUrl}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Open Draft</a>
      </p>
    `
  )
  return { subject, htmlContent, textContent }
}

async function sendClaimedEmails(
  recipients: LifecycleEmailClaim[],
  buildEmail: (name: string, leagueName: string, leagueId: string) => {
    subject: string
    htmlContent: string
    textContent: string
  },
  source: string,
  extraMetadata?: (recipient: LifecycleEmailClaim) => Record<string, unknown>
) {
  for (const recipient of recipients) {
    if (!recipient.email) continue
    const name = recipient.username || recipient.email.split('@')[0] || 'there'
    const leagueName = recipient.league_name || 'your league'
    const payload = buildEmail(name, leagueName, recipient.league_id)
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
          source,
          ...(extraMetadata ? extraMetadata(recipient) : {}),
        },
      },
    })
    if (emailError) {
      console.error(`Error sending ${source} email:`, emailError)
    }
  }
}

/** Claim and email every human member once when the snake draft opens. */
export async function notifyMarketplaceStartedIfNeeded(leagueId: string): Promise<void> {
  if (!leagueId) return

  try {
    const { data, error } = await supabase.rpc('claim_league_lifecycle_emails', {
      p_event: 'marketplace_started',
      p_league_id: leagueId,
    })

    if (error) {
      console.error('Error claiming marketplace started emails:', error)
      return
    }

    await sendClaimedEmails(
      (data || []) as LifecycleEmailClaim[],
      createMarketplaceStartedEmail,
      'marketplace_started'
    )
  } catch (error) {
    console.error('Error notifying marketplace started:', error)
  }
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

    await sendClaimedEmails(
      (data || []) as MarketplaceTurnEmailClaim[],
      createMarketplaceTurnEmail,
      'marketplace_turn',
      (recipient) => ({ turnNumber: (recipient as MarketplaceTurnEmailClaim).turn_number })
    )
  } catch (error) {
    console.error('Error notifying marketplace turn:', error)
  }
}
