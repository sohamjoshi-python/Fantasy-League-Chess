import { supabase } from './supabase'

// The process-marketplace-turns Edge Function claims and sends every draft email
// server-side (pg_cron also runs it every minute), so the browser never sees
// another member's email address. This just asks it to run sooner.
const MIN_REQUEST_GAP_MS = 15_000
const lastRequestAt = new Map<string, number>()

async function requestDraftEmails(leagueId: string): Promise<void> {
  if (!leagueId) return
  const now = Date.now()
  if (now - (lastRequestAt.get(leagueId) ?? 0) < MIN_REQUEST_GAP_MS) return
  lastRequestAt.set(leagueId, now)

  const { error } = await supabase.functions.invoke('process-marketplace-turns', {
    body: { leagueId },
  })
  if (error) {
    console.error('Error requesting draft emails:', error)
  }
}

/** Ask the server to email every human member once when the snake draft opens. */
export async function notifyMarketplaceStartedIfNeeded(leagueId: string): Promise<void> {
  await requestDraftEmails(leagueId)
}

/** Ask the server to email the current picker once per turn. Safe to call on every turn change. */
export async function notifyMarketplaceTurnIfNeeded(leagueId: string): Promise<void> {
  await requestDraftEmails(leagueId)
}
