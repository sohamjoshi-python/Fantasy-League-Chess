import { createClient } from '@supabase/supabase-js'
import { Bot } from '../types'

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

/**
 * Create a bot for a league
 * @param leagueId string
 * @param botName string
 * @returns {Promise<{ success: boolean, bot?: Bot, error?: any }>}
 */
export async function createBot(leagueId: string, botName: string): Promise<{ success: boolean, bot?: Bot, error?: any }> {
  const { data, error } = await supabase
    .from('bots')
    .insert({
      league_id: leagueId,
      name: botName
    })
    .select()
    .single();
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true, bot: data };
}

/**
 * Remove a bot from a league
 * @param botId string
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function removeBot(botId: string): Promise<{ success: boolean, error?: any }> {
  const { error } = await supabase
    .from('bots')
    .delete()
    .eq('id', botId);
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true };
}

/**
 * Get the highest ELO player available for drafting
 * @param leagueId string
 * @returns {Promise<{ success: boolean, player?: any, error?: any }>}
 */
export async function getHighestEloAvailablePlayer(leagueId: string): Promise<{ success: boolean, player?: any, error?: any }> {
  // Get all drafted players in this league
  const { data: draftedPlayers, error: draftedError } = await supabase
    .from('teams')
    .select('player_ids')
    .eq('league_id', leagueId);
  
  if (draftedError) {
    return { success: false, error: draftedError };
  }
  
  // Flatten all drafted player IDs
  const draftedPlayerIds = draftedPlayers?.flatMap(team => team.player_ids || []) || [];
  
  // Get the highest ELO player not yet drafted
  let availablePlayer = null;
  let playerError = null;
  
  if (draftedPlayerIds.length === 0) {
    // If no players are drafted yet, get the highest ELO player
    const { data, error } = await supabase
      .from('chess_players')
      .select('*')
      .order('elo', { ascending: false })
      .limit(1)
      .single();
    availablePlayer = data;
    playerError = error;
  } else {
    // If some players are drafted, exclude them
    const { data, error } = await supabase
      .from('chess_players')
      .select('*')
      .not('id', 'in', `(${draftedPlayerIds.map(id => `'${id}'`).join(',')})`)
      .order('elo', { ascending: false })
      .limit(1)
      .single();
    availablePlayer = data;
    playerError = error;
  }
  
  if (playerError) {
    return { success: false, error: playerError };
  }
  
  return { success: true, player: availablePlayer };
}

/**
 * Auto-draft for a bot (selects highest ELO available player)
 * @param botId string
 * @param leagueId string
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function autoDraftForBot(botId: string, leagueId: string): Promise<{ success: boolean, error?: any }> {
  try {
    console.log('Auto-drafting for bot:', botId, 'in league:', leagueId);
    
    // Get the bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single();
    
    if (botError) {
      console.error('Bot fetch error:', botError);
      return { success: false, error: botError };
    }
    
    console.log('Found bot:', bot);
    
    // Get highest ELO available player
    const { success, player, error: playerError } = await getHighestEloAvailablePlayer(leagueId);
    if (!success || !player) {
      console.error('Player fetch error:', playerError);
      return { success: false, error: playerError };
    }
    
    console.log('Selected player for bot:', player);
    
    // Create or get bot's team
    let team = null;
    if (bot.team_id) {
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('*')
        .eq('id', bot.team_id)
        .single();
      team = existingTeam;
    }
    
    if (!team) {
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({ 
          user_id: botId, // Use bot ID as user_id for teams
          league_id: leagueId, 
          player_ids: [] 
        })
        .select()
        .single();
      
      if (teamError) {
        return { success: false, error: teamError };
      }
      
      team = newTeam;
      
      // Update bot with team_id
      await supabase
        .from('bots')
        .update({ team_id: newTeam.id })
        .eq('id', botId);
    }
    
    // Add player to bot's team
    const newPlayerIds = [...(team.player_ids || []), player.id];
    const { error: teamUpdateError } = await supabase
      .from('teams')
      .update({ player_ids: newPlayerIds })
      .eq('id', team.id);
    
    if (teamUpdateError) {
      return { success: false, error: teamUpdateError };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error };
  }
}

/**
 * Auto-set lineup for a bot (selects 5 highest ELO players from their team)
 * @param botId string
 * @param leagueId string
 * @param weekStartDate string
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function autoSetLineupForBot(botId: string, leagueId: string, weekStartDate: string): Promise<{ success: boolean, error?: any }> {
  try {
    // Get bot's team
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('team_id')
      .eq('id', botId)
      .single();
    
    if (botError || !bot.team_id) {
      return { success: false, error: botError };
    }
    
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('player_ids')
      .eq('id', bot.team_id)
      .single();
    
    if (teamError || !team.player_ids || team.player_ids.length < 5) {
      return { success: false, error: teamError };
    }
    
    // Get all players in bot's team, sorted by ELO
    const { data: players, error: playersError } = await supabase
      .from('chess_players')
      .select('*')
      .in('id', team.player_ids)
      .order('elo', { ascending: false });
    
    if (playersError) {
      return { success: false, error: playersError };
    }
    
    // Select top 5 players by ELO
    const top5PlayerIds = players.slice(0, 5).map(p => p.id);
    
    // Save lineup
    const { error: lineupError } = await supabase
      .from('lineups')
      .upsert({
        user_id: botId, // Use bot ID as user_id
        league_id: leagueId,
        week_start_date: weekStartDate,
        player_ids: top5PlayerIds,
        total_points: 0
      });
    
    if (lineupError) {
      return { success: false, error: lineupError };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error };
  }
} 