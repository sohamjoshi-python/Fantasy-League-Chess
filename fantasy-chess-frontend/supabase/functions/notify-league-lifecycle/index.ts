import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getSecretKey } from "../_shared/supabaseKeys.ts"
import { GENERIC_ERROR, logServerError } from "../_shared/publicError.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const siteUrl = "https://fantasyleaguechess.com"
const logoUrl = "https://fantasyleaguechess.com/assets/fantasy-league-chess-logo-updated.png"

type LifecycleEvent = "marketplace_started" | "league_started" | "scan"

type LeagueRow = {
  id: string
  name: string
  member_ids: string[] | null
  start_date: string | null
  end_date: string | null
  marketplace_started?: boolean | null
  marketplace_started_email_sent_at?: string | null
  league_started_email_sent_at?: string | null
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function getPacificTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function formatLeagueDate(ymd: string | null): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "today"
  const [year, month, day] = ymd.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

function createLifecycleEmail({
  recipientName,
  leagueName,
  leagueUrl,
  event,
  startDateLabel,
}: {
  recipientName: string
  leagueName: string
  leagueUrl: string
  event: "marketplace_started" | "league_started"
  startDateLabel: string
}) {
  const isMarketplace = event === "marketplace_started"
  const title = isMarketplace ? "The Draft Is Open" : "Your League Has Started"
  const headline = isMarketplace
    ? `The turn-based marketplace for ${leagueName} has started.`
    : `${leagueName} starts today.`
  const details = isMarketplace
    ? "Managers now take turns buying chess players. Open the league to make your picks before the draft moves on."
    : "Points start counting now. Set your weekly lineup and check the marketplace for trades."
  const buttonLabel = isMarketplace ? "Open Draft" : "Open League"

  const textContent = [
    `Hi ${recipientName},`,
    headline,
    details,
    `League: ${leagueName}`,
    `Start date: ${startDateLabel}`,
    `${buttonLabel}: ${leagueUrl}`,
  ].join("\n\n")

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
            <img src="${logoUrl}" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">${escapeHtml(title)}</h1>
          </div>
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 18px;">Hi ${escapeHtml(recipientName)},</p>
            <p style="margin: 0 0 18px;">${escapeHtml(headline)}</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 22px 0;">
              <p style="margin: 0 0 8px;"><strong>League:</strong> ${escapeHtml(leagueName)}</p>
              <p style="margin: 0;"><strong>Start date:</strong> ${escapeHtml(startDateLabel)}</p>
            </div>
            <p style="margin: 0 0 24px;">${escapeHtml(details)}</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="${leagueUrl}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">${escapeHtml(buttonLabel)}</a>
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
    subject: isMarketplace
      ? `The draft is open in ${leagueName}`
      : `${leagueName} has started`,
    htmlContent,
    textContent,
  }
}

async function sendResendEmail(args: {
  to: string
  subject: string
  htmlContent: string
  textContent: string
  userId?: string
  leagueId?: string
  templateId: string
  supabase: SupabaseClient
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.")
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Fantasy League Chess <noreply@fantasyleaguechess.com>",
      to: [args.to],
      subject: args.subject,
      html: args.htmlContent,
      text: args.textContent,
    }),
  })

  if (!resendResponse.ok) {
    const errorData = await resendResponse.text()
    throw new Error(`Resend API error: ${resendResponse.status} - ${errorData}`)
  }

  try {
    await args.supabase.from("emails").insert({
      id: crypto.randomUUID(),
      user_id: args.userId,
      league_id: args.leagueId,
      template_id: args.templateId,
      to_email: args.to,
      subject: args.subject,
      html_content: args.htmlContent,
      text_content: args.textContent,
      metadata: { source: "notify-league-lifecycle", templateId: args.templateId },
      sent_at: new Date().toISOString(),
      status: "sent",
    })
  } catch (dbError) {
    console.error("Database error storing email:", dbError)
  }
}

async function claimLeague(supabase: SupabaseClient, leagueId: string, event: "marketplace_started" | "league_started") {
  const column = event === "marketplace_started"
    ? "marketplace_started_email_sent_at"
    : "league_started_email_sent_at"

  const { data, error } = await supabase
    .from("leagues")
    .update({ [column]: new Date().toISOString() })
    .eq("id", leagueId)
    .is(column, null)
    .select("id")

  if (error) throw error
  return (data || []).length > 0
}

async function loadHumanMembers(supabase: SupabaseClient, memberIds: string[]) {
  const uniqueIds = Array.from(new Set(memberIds.filter(Boolean)))
  if (uniqueIds.length === 0) return []

  const [{ data: users, error: usersError }, { data: bots, error: botsError }] = await Promise.all([
    supabase.from("users").select("id, email, username").in("id", uniqueIds),
    supabase.from("bots").select("id").in("id", uniqueIds),
  ])

  if (usersError) throw usersError
  if (botsError) throw botsError

  const botIds = new Set((bots || []).map((bot) => bot.id))
  return (users || []).filter(
    (user): user is { id: string; email: string; username: string | null } =>
      Boolean(user.email) && !botIds.has(user.id),
  )
}

async function notifyLeague(
  supabase: SupabaseClient,
  league: LeagueRow,
  event: "marketplace_started" | "league_started",
) {
  const claimed = await claimLeague(supabase, league.id, event)
  if (!claimed) {
    return { leagueId: league.id, event, emailsSent: 0, skipped: true }
  }

  const members = await loadHumanMembers(supabase, league.member_ids || [])
  const leagueUrl = `${siteUrl}/league/${league.id}`
  const startDateLabel = formatLeagueDate(league.start_date)
  let emailsSent = 0
  const emailErrors: string[] = []

  for (const member of members) {
    const { subject, htmlContent, textContent } = createLifecycleEmail({
      recipientName: member.username || member.email.split("@")[0] || "there",
      leagueName: league.name || "your league",
      leagueUrl,
      event,
      startDateLabel,
    })

    try {
      await sendResendEmail({
        to: member.email,
        subject,
        htmlContent,
        textContent,
        userId: member.id,
        leagueId: league.id,
        templateId: event,
        supabase,
      })
      emailsSent += 1
    } catch (error) {
      logServerError("notify-league-lifecycle", error)
      emailErrors.push("Could not send email")
    }
  }

  return { leagueId: league.id, event, emailsSent, emailErrors }
}

async function leaguesNeedingMarketplaceEmail(supabase: SupabaseClient, leagueId?: string) {
  let query = supabase
    .from("leagues")
    .select("id, name, member_ids, start_date, end_date, marketplace_started, marketplace_started_email_sent_at")
    .eq("marketplace_started", true)
    .is("marketplace_started_email_sent_at", null)

  if (leagueId) query = query.eq("id", leagueId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as LeagueRow[]
}

async function leaguesNeedingStartEmail(supabase: SupabaseClient, leagueId?: string) {
  const ptToday = getPacificTodayDate()
  let query = supabase
    .from("leagues")
    .select("id, name, member_ids, start_date, end_date, league_started_email_sent_at")
    .lte("start_date", ptToday)
    .is("league_started_email_sent_at", null)

  if (leagueId) query = query.eq("id", leagueId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as LeagueRow[]
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const event = (body?.event || "scan") as LifecycleEvent
    const leagueId = typeof body?.leagueId === "string" && body.leagueId ? body.leagueId : undefined

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = getSecretKey()
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results: Array<Record<string, unknown>> = []
    const shouldSendMarketplace = event === "scan" || event === "marketplace_started"
    const shouldSendLeagueStart = event === "scan" || event === "league_started"

    if (shouldSendMarketplace) {
      const leagues = await leaguesNeedingMarketplaceEmail(supabase, leagueId)
      for (const league of leagues) {
        results.push(await notifyLeague(supabase, league, "marketplace_started"))
      }
    }

    if (shouldSendLeagueStart) {
      const leagues = await leaguesNeedingStartEmail(supabase, leagueId)
      for (const league of leagues) {
        results.push(await notifyLeague(supabase, league, "league_started"))
      }
    }

    const emailsSent = results.reduce((sum, row) => sum + Number(row.emailsSent || 0), 0)

    return new Response(
      JSON.stringify({ success: true, emailsSent, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    logServerError("notify-league-lifecycle", error)
    return new Response(
      JSON.stringify({ success: false, error: GENERIC_ERROR }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
