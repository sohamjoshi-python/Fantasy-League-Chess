import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Most recent Titled Tuesday (calendar date in US Eastern). */
function getEasternTuesdayDate(reference = new Date()): string {
  const easternToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(reference)

  const [year, month, day] = easternToday.split('-').map(Number)
  const cursor = new Date(Date.UTC(year, month - 1, day))
  const daysSinceTuesday = (cursor.getUTCDay() - 2 + 7) % 7
  cursor.setUTCDate(cursor.getUTCDate() - daysSinceTuesday)
  return cursor.toISOString().slice(0, 10)
}

function parseWeekDate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const weekDate = (body as { week_date?: unknown }).week_date
  if (typeof weekDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekDate)) {
    return null
  }
  return weekDate
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let tuesdayDate = getEasternTuesdayDate()
    try {
      const body = await req.json()
      const requested = parseWeekDate(body)
      if (requested) {
        tuesdayDate = requested
      }
    } catch {
      // No JSON body — use Eastern Tuesday
    }

    const monday = new Date(`${tuesdayDate}T12:00:00Z`)
    monday.setUTCDate(monday.getUTCDate() - 1)
    const lineupWeekStart = monday.toISOString().slice(0, 10)

    console.log(`Scoring lineups for TT ${tuesdayDate} (lineups.week_start_date=${lineupWeekStart})`)

    const { error } = await supabase.rpc('process_weekly_results', {
      week_date: tuesdayDate,
    })

    if (error) {
      console.error('Error processing weekly results:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let emailsSent = 0
    try {
      const { data: usersWithResults, error: usersError } = await supabase
        .from('lineups')
        .select(`
          user_id,
          users!inner(email)
        `)
        .eq('week_start_date', lineupWeekStart)
        .not('total_points', 'is', null)

      if (usersError) {
        console.error('Error fetching users with results:', usersError)
      } else if (usersWithResults) {
        emailsSent = usersWithResults.length
        console.log(`Sending weekly results emails to ${emailsSent} users`)

        for (const userResult of usersWithResults) {
          if (userResult.users?.email) {
            try {
              await supabase.functions.invoke('send-free-email', {
                body: {
                  emailType: 'weekly_results',
                  userEmail: userResult.users.email,
                },
              })
              console.log(`Weekly results email sent to ${userResult.users.email}`)
            } catch (emailError) {
              console.error(`Error sending email to ${userResult.users.email}:`, emailError)
            }
          }
        }
      }
    } catch (emailError) {
      console.error('Error in email sending process:', emailError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: tuesdayDate,
        lineup_week_start: lineupWeekStart,
        message: `Processed weekly results for ${tuesdayDate}`,
        emailsSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
