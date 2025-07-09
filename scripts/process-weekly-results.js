const { createClient } = require('@supabase/supabase-js')

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function processWeeklyResults() {
  try {
    // Get the current date and calculate the most recent Tuesday
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 2 = Tuesday
    const daysSinceTuesday = (now.getDay() - 2 + 7) % 7
    const lastTuesday = new Date(now)
    lastTuesday.setDate(now.getDate() - daysSinceTuesday)
    
    // Format as YYYY-MM-DD
    const tuesdayDate = lastTuesday.toISOString().split('T')[0]

    // Call the enhanced process_weekly_results function
    const { data, error } = await supabase.rpc('process_weekly_results_enhanced', {
      week_date: tuesdayDate
    })

    if (error) {
      console.error('Error processing weekly results:', error)
      process.exit(1)
    }


    
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

// Run the function
processWeeklyResults() 