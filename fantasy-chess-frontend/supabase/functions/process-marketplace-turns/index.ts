import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SITE_URL = "https://fantasyleaguechess.com"
const LOGO_URL = `${SITE_URL}/assets/fantasy-league-chess-logo-updated.png`

type TurnEmailClaim = {
  league_id: string
  league_name: string | null
  turn_number: number | null
  user_id: string
  email: string
  username: string | null
}

type TurnEmailExtras = {
  heading?: string
  timeoutLabel?: string
  roundLabel?: string
  picksHtml?: string
  picksText?: string
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

type LifecycleEmailClaim = {
  league_id: string
  league_name: string | null
  user_id: string
  email: string
  username: string | null
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
            <p style="margin: 0;">&copy; 2026 Fantasy League Chess. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

function createMarketplaceStartedEmail(
  recipientName: string,
  leagueName: string,
  leagueId: string,
  timeoutLabel: string
) {
  const leagueUrl = `${SITE_URL}/league/${leagueId}`
  const subject = `The draft is open in ${leagueName}`
  const textContent = [
    `Hi ${recipientName},`,
    `The snake draft for ${leagueName} has started.`,
    `Managers take turns buying chess players. Each turn has ${timeoutLabel}. If you don't pick, that turn is skipped and you can still add players later in the regular marketplace.`,
    `You'll get another email when it's your turn.`,
    `Open draft: ${leagueUrl}`,
  ].join("\n\n")
  const htmlContent = wrapLeagueEmail(
    "The Draft Is Open",
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

function createTurnEmail(
  recipientName: string,
  leagueName: string,
  leagueId: string,
  extras: TurnEmailExtras | null
) {
  const leagueUrl = `${SITE_URL}/league/${leagueId}`
  const timeoutLabel = extras?.timeoutLabel || "12 hours"
  const heading = extras?.heading || "Your 1st Round Pick"
  const picksText = extras?.picksText?.trim() || ""
  const picksHtml = extras?.picksHtml?.trim() || ""
  const subject = `${heading} in ${leagueName}`
  const textContent = [
    `Hi ${recipientName},`,
    `${heading} in the draft for ${leagueName}.`,
    `You have ${timeoutLabel} to buy a player. If you don't pick, this turn is skipped and you can still add players later in the regular marketplace.`,
    picksText ? `Picks so far:\n${picksText}` : "",
    `Make your pick: ${leagueUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n")
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="${LOGO_URL}" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">${escapeHtml(heading)}</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi ${escapeHtml(recipientName)},</p>
            <p style="margin: 0 0 18px;">It's time for your pick in <strong>${escapeHtml(leagueName)}</strong>.</p>
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0;"><strong>You have ${escapeHtml(timeoutLabel)}</strong> to buy a player. If you don't pick, this turn is skipped.</p>
            </div>
            ${
              picksHtml
                ? `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 0 0 22px;"><p style="margin: 0 0 12px; font-weight: bold;">Picks so far</p>${picksHtml}</div>`
                : ""
            }
            <p style="margin: 0 0 24px;">You can still add players later in the regular marketplace after the snake draft ends.</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="${leagueUrl}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Make Your Pick</a>
            </p>
          </div>
          <div style="text-align: center; font-size: 12px; color: #777777; padding: 0 24px 24px;">
            <p style="margin: 0;">&copy; 2026 Fantasy League Chess. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
  return { subject, htmlContent, textContent }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey)
    const body = await req.json().catch(() => ({})) as {
      leagueId?: string
      league_id?: string
      p_league_id?: string
    }
    const leagueId = body.leagueId || body.league_id || body.p_league_id || null

    const { data: skipResult, error: skipError } = await supabase.rpc(
      "skip_expired_marketplace_turns",
      {
        p_timeout_hours: 12,
        p_league_id: leagueId,
      }
    )
    if (skipError) {
      console.error("skip_expired_marketplace_turns failed:", skipError)
    }

    let startedQuery = supabase
      .from("leagues")
      .select("id")
      .eq("marketplace_started", true)
      .is("marketplace_started_email_sent_at", null)
    if (leagueId) startedQuery = startedQuery.eq("id", leagueId)
    const { data: startedLeagues } = await startedQuery
    const failures: string[] = []
    let startedEmailsSent = 0
    for (const startedLeague of startedLeagues || []) {
      const { data: startedRecipients, error: startedClaimError } = await supabase.rpc(
        "claim_league_lifecycle_emails",
        { p_event: "marketplace_started", p_league_id: startedLeague.id }
      )
      if (startedClaimError) {
        console.error("claim_league_lifecycle_emails failed:", startedClaimError)
        continue
      }
      const { data: timeoutLabel } = await supabase.rpc("marketplace_turn_timeout_label", {
        p_league_id: startedLeague.id,
      })
      for (const recipient of (startedRecipients || []) as LifecycleEmailClaim[]) {
        if (!recipient.email) continue
        const name = recipient.username || recipient.email.split("@")[0] || "there"
        const leagueName = recipient.league_name || "your league"
        const payload = createMarketplaceStartedEmail(
          name,
          leagueName,
          recipient.league_id,
          (timeoutLabel as string) || "12 hours"
        )
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-resend-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: recipient.email,
            subject: payload.subject,
            htmlContent: payload.htmlContent,
            textContent: payload.textContent,
            emailType: "custom",
            userId: recipient.user_id,
            leagueId: recipient.league_id,
            metadata: { source: "process_marketplace_turns", event: "marketplace_started" },
          }),
        })
        if (!sendResponse.ok) {
          const details = await sendResponse.text()
          failures.push(`${recipient.email}: ${details}`)
          await supabase
            .from("leagues")
            .update({ marketplace_started_email_sent_at: null })
            .eq("id", recipient.league_id)
          continue
        }
        startedEmailsSent += 1
      }
    }

    const { data: recipients, error: claimError } = await supabase.rpc(
      "claim_marketplace_turn_emails",
      { p_league_id: leagueId }
    )
    if (claimError) {
      throw claimError
    }

    const claims = (recipients || []) as TurnEmailClaim[]
    let emailsSent = 0

    for (const recipient of claims) {
      if (!recipient.email) continue
      const name = recipient.username || recipient.email.split("@")[0] || "there"
      const leagueName = recipient.league_name || "your league"
      const { data: extras } = await supabase.rpc("get_marketplace_turn_email_extras", {
        p_league_id: recipient.league_id,
        p_exclude_user_id: recipient.user_id,
        p_turn_number: recipient.turn_number,
      })
      const payload = createTurnEmail(
        name,
        leagueName,
        recipient.league_id,
        (extras || null) as TurnEmailExtras | null
      )
      const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-resend-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipient.email,
          subject: payload.subject,
          htmlContent: payload.htmlContent,
          textContent: payload.textContent,
          emailType: "custom",
          userId: recipient.user_id,
          leagueId: recipient.league_id,
          metadata: {
            source: "process_marketplace_turns",
            turnNumber: recipient.turn_number,
            roundLabel: (extras as TurnEmailExtras | null)?.roundLabel,
          },
        }),
      })
      if (!sendResponse.ok) {
        const details = await sendResponse.text()
        failures.push(`${recipient.email}: ${details}`)
        await supabase
          .from("leagues")
          .update({ marketplace_turn_email_sent_for: null })
          .eq("id", recipient.league_id)
          .eq("marketplace_turn_email_sent_for", recipient.turn_number)
        continue
      }
      emailsSent += 1
    }

    return new Response(
      JSON.stringify({
        success: failures.length === 0,
        skipped: skipResult,
        claimed: claims.length,
        emailsSent,
        startedEmailsSent,
        failures,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("process-marketplace-turns failed:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
