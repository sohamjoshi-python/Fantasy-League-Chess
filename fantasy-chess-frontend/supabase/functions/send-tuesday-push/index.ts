import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { getSecretKey } from '../_shared/supabaseKeys.ts'
import { denied, identifyCaller } from '../_shared/callerAuth.ts'
import { GENERIC_ERROR, logServerError } from '../_shared/publicError.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REMINDER = {
  title: 'Titled Tuesday is tomorrow',
  body: 'Set your lineup tonight. It locks when Tuesday starts (US Eastern).',
  url: '/dashboard',
}

function easternNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: 'numeric',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now).map((part) => [part.type, part.value]),
  )
  return {
    weekday: String(parts.weekday),
    hour: Number(parts.hour),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, getSecretKey())
    const caller = await identifyCaller(req, supabase)
    if (caller.kind !== 'service') return denied(corsHeaders)

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const when = easternNow()
    const due = when.weekday === 'Mon' && when.hour === 20
    if (!body.force && !due) {
      return json({ success: true, skipped: true, reason: 'not_monday_8pm_eastern', ...when })
    }

    if (!body.force) {
      const { data: already, error: alreadyError } = await supabase
        .from('push_reminder_sends')
        .select('sent_on')
        .eq('kind', 'tuesday_lineup')
        .eq('sent_on', when.date)
        .maybeSingle()
      if (alreadyError) throw alreadyError
      if (already) return json({ success: true, skipped: true, reason: 'already_sent', date: when.date })
    }

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    if (!publicKey || !privateKey) {
      return json({ success: false, error: 'Missing VAPID keys.' }, 500)
    }

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') || 'mailto:soham@fantasyleaguechess.com',
      publicKey,
      privateKey,
    )

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
    if (error) throw error

    let sent = 0
    let failed = 0
    const expired: string[] = []

    for (const subscription of subscriptions || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(REMINDER),
        )
        sent += 1
      } catch (sendError: any) {
        failed += 1
        const status = sendError?.statusCode
        if (status === 404 || status === 410) expired.push(subscription.id)
        else logServerError('send-tuesday-push', sendError)
      }
    }

    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expired)
    }

    if (!body.force) {
      const { error: logError } = await supabase.from('push_reminder_sends').upsert({
        kind: 'tuesday_lineup',
        sent_on: when.date,
        sent_count: sent,
      })
      if (logError) throw logError
    }

    return json({ success: true, sent, failed, removed: expired.length, date: when.date })
  } catch (error) {
    logServerError('send-tuesday-push', error)
    return json({ success: false, error: GENERIC_ERROR }, 500)
  }
})
