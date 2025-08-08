import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the current date and calculate the most recent Tuesday
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 2 = Tuesday
    const daysSinceTuesday = (now.getDay() - 2 + 7) % 7
    const lastTuesday = new Date(now)
    lastTuesday.setDate(now.getDate() - daysSinceTuesday)
    
    // Format as YYYY-MM-DD
    const tuesdayDate = lastTuesday.toISOString().split('T')[0]

    // Call the process_weekly_results function
    const { data, error } = await supabase.rpc('process_weekly_results', {
      week_date: tuesdayDate
    })

    if (error) {
      console.error('Error processing weekly results:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // After processing weekly results, send emails to all users with results
    try {
      // Get all users who have lineup results for this week
      const { data: usersWithResults, error: usersError } = await supabase
        .from('lineups')
        .select(`
          user_id,
          users!inner(email)
        `)
        .eq('week_start_date', tuesdayDate)
        .not('total_points', 'is', null)

      if (usersError) {
        console.error('Error fetching users with results:', usersError)
      } else if (usersWithResults) {
        console.log(`Sending weekly results emails to ${usersWithResults.length} users`)
        
        // Send weekly results email to each user
        for (const userResult of usersWithResults) {
          if (userResult.users?.email) {
            try {
              await supabase.functions.invoke('send-email', {
                body: {
                  emailType: 'weekly_results',
                  userEmail: userResult.users.email
                }
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
      // Don't fail the entire process if emails fail
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        date: tuesdayDate,
        message: `Processed weekly results for ${tuesdayDate}`,
        emailsSent: usersWithResults?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 
