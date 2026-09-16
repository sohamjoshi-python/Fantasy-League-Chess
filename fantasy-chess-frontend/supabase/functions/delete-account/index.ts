import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Tables that reference the account via a `user_id` column and can be safely purged.
const USER_ID_TABLES = [
  'lineups',
  'teams',
  'league_coin_balances',
  'notifications',
  'emails',
  'feedback_reports',
  'user_avatars',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // Verify the caller and derive the account to delete from their own token.
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userId = userData.user.id
    const cleanupErrors: string[] = []

    // Remove the user from any league membership / draft order arrays so leagues stay consistent.
    try {
      const { data: leagues, error: leaguesError } = await admin
        .from('leagues')
        .select('id, member_ids, draft_order')
        .contains('member_ids', [userId])
      if (leaguesError) throw leaguesError

      for (const league of leagues || []) {
        const memberIds = (league.member_ids || []).filter((id: string) => id !== userId)
        const draftOrder = (league.draft_order || []).filter((id: string) => id !== userId)
        const { error: updateError } = await admin
          .from('leagues')
          .update({ member_ids: memberIds, draft_order: draftOrder })
          .eq('id', league.id)
        if (updateError) throw updateError
      }
    } catch (error) {
      console.error('delete-account: failed to update leagues', error)
      cleanupErrors.push('leagues')
    }

    // Purge child rows keyed by user_id (best-effort; tables without the column are skipped).
    for (const table of USER_ID_TABLES) {
      try {
        const { error } = await admin.from(table).delete().eq('user_id', userId)
        if (error) throw error
      } catch (error) {
        console.error(`delete-account: failed to delete from ${table}`, error)
        cleanupErrors.push(table)
      }
    }

    // Trades reference the user as either side of the deal.
    for (const column of ['seller_id', 'buyer_id']) {
      try {
        const { error } = await admin.from('trades').delete().eq(column, userId)
        if (error) throw error
      } catch (error) {
        console.error(`delete-account: failed to delete trades by ${column}`, error)
        cleanupErrors.push(`trades.${column}`)
      }
    }

    // Delete the public profile row.
    try {
      const { error } = await admin.from('users').delete().eq('id', userId)
      if (error) throw error
    } catch (error) {
      console.error('delete-account: failed to delete users row', error)
      cleanupErrors.push('users')
    }

    // Finally, delete the auth account. This is the critical step.
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      throw authDeleteError
    }

    return new Response(
      JSON.stringify({ success: true, cleanupErrors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('delete-account error:', error)
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
