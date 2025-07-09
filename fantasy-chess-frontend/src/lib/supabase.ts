import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 

/**
 * Call the process_weekly_results_enhanced RPC to calculate and update all lineup points for a given week.
 * @param weekDate string (YYYY-MM-DD)
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function processWeeklyResultsEnhanced(weekDate: string) {
  const { data, error } = await supabase.rpc('process_weekly_results_enhanced', {
    week_date: weekDate
  });
  if (error) {
    return { success: false, error };
  }
  return { success: true, data };
} 

/**
 * Fetch the official per-player breakdown for a lineup using the get_lineup_player_breakdown RPC.
 * @param userId string
 * @param leagueId string
 * @param weekDate string (YYYY-MM-DD)
 * @returns {Promise<Array<{ player_id: string, player_name: string, player_points: number }>>}
 */
export async function fetchLineupPlayerBreakdown(userId: string, leagueId: string, weekDate: string): Promise<Array<{ player_id: string, player_name: string, player_points: number }>> {
  const { data, error } = await supabase.rpc('get_lineup_player_breakdown', {
    user_id_input: userId,
    league_id_input: leagueId,
    week_date_input: weekDate
  });
  if (error) {
    console.error('Error fetching player breakdown:', error);
    return [];
  }
  return data;
} 