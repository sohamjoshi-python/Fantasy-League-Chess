const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SB_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function distributeWeeklyStarPoints() {
  try {
    console.log('Starting weekly star points distribution...')
    
    // Call the function to award weekly star points
    const { data, error } = await supabase
      .rpc('award_weekly_star_points')
    
    if (error) {
      console.error('Error distributing weekly star points:', error)
      return
    }
    
    console.log('Weekly star points distributed successfully!')
    
    // Get a summary of the distribution
    const { data: summary } = await supabase
      .from('star_point_transactions')
      .select('*')
      .eq('transaction_type', 'weekly_bonus')
      .gte('created_at', new Date().toISOString().split('T')[0])
    
    if (summary) {
      console.log(`Distributed ${summary.length} weekly bonuses today`)
    }
    
  } catch (error) {
    console.error('Error in weekly star points distribution:', error)
  }
}

// Run the distribution
distributeWeeklyStarPoints() 