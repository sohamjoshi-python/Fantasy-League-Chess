import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Email only after the user has been away longer than this. */
export const ACTIVE_WINDOW_MS = 30 * 60 * 1000

export type SiteDelivery = 'email' | 'activity' | 'notification'

export async function recipientIsActive(
  supabase: SupabaseClient,
  userId: string | undefined,
): Promise<boolean> {
  if (!userId) return false
  const { data, error } = await supabase
    .from('users')
    .select('last_active_at')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data?.last_active_at) return false
  const seenAt = new Date(data.last_active_at).getTime()
  if (!Number.isFinite(seenAt)) return false
  return Date.now() - seenAt <= ACTIVE_WINDOW_MS
}

export async function insertSiteNotification(
  supabase: SupabaseClient,
  row: {
    userId: string
    leagueId?: string | null
    title: string
    message: string
    type: string
    data?: Record<string, unknown>
  },
): Promise<boolean> {
  const { error } = await supabase.from('notifications').insert({
    user_id: row.userId,
    league_id: row.leagueId || null,
    title: row.title,
    message: row.message,
    type: row.type,
    is_read: false,
    data: row.data || {},
  })
  if (error) {
    console.error('notification insert failed')
    return false
  }
  return true
}
