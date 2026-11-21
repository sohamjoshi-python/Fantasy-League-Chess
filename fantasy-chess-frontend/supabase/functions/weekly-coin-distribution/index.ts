import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getSecretKey } from '../_shared/supabaseKeys.ts'
import { GENERIC_ERROR, logServerError } from '../_shared/publicError.ts'
import { denied, identifyCaller } from '../_shared/callerAuth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = getSecretKey()
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    if ((await identifyCaller(req, supabase)).kind !== 'service') {
      return denied(corsHeaders)
    }

    const body = await req.json().catch(() => ({}))
    const { data: lastRun } = await supabase
      .from('weekly_coin_distributions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const sixDaysMs = 6 * 24 * 60 * 60 * 1000
    if (!body?.force && lastRun?.created_at && Date.now() - new Date(lastRun.created_at).getTime() < sixDaysMs) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: 'Coins were already distributed this week', lastRun: lastRun.created_at }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Starting weekly coin distribution to active leagues...')

    // Call the function to distribute coins to all active leagues
    const { data, error } = await supabase.rpc('distribute_weekly_coins_to_active_leagues_with_history')

    if (error) {
      logServerError('weekly-coin-distribution', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: GENERIC_ERROR,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get recent distribution history
    const { data: history } = await supabase
      .from('weekly_coin_distributions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('Weekly coin distribution completed successfully!')
    console.log('Result:', JSON.stringify(data, null, 2))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Weekly coin distribution completed',
        result: data,
        history: history,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    logServerError('weekly-coin-distribution', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: GENERIC_ERROR,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 