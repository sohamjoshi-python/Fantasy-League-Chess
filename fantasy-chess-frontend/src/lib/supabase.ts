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
  try {
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
    
    console.log('Drafted player IDs:', draftedPlayerIds);
    
    // Get the highest ELO player not yet drafted
    let availablePlayer = null;
    let playerError = null;
    
    if (draftedPlayerIds.length === 0) {
      // If no players are drafted yet, get the highest ELO player
      console.log('No players drafted yet, getting highest ELO player');
      const { data, error } = await supabase
        .from('chess_players')
        .select('*')
        .order('elo', { ascending: false })
        .limit(1)
        .single();
      availablePlayer = data;
      playerError = error;
    } else {
      // If some players are drafted, get all players and filter in JavaScript
      console.log('Some players drafted, filtering in JavaScript');
      const { data: allPlayers, error } = await supabase
        .from('chess_players')
        .select('*')
        .order('elo', { ascending: false });
      
      if (error) {
        return { success: false, error };
      }
      
      // Filter out drafted players
      const availablePlayers = allPlayers?.filter(player => !draftedPlayerIds.includes(player.id)) || [];
      availablePlayer = availablePlayers[0]; // Get the highest ELO available player
      playerError = availablePlayers.length === 0 ? 'No available players' : null;
    }
    
    if (playerError) {
      return { success: false, error: playerError };
    }
    
    console.log('Selected available player:', availablePlayer);
    return { success: true, player: availablePlayer };
  } catch (error: any) {
    console.error('Error in getHighestEloAvailablePlayer:', error);
    return { success: false, error };
  }
}

/**
 * Auto-draft for a bot (selects highest ELO available player)
 * @param botId string
 * @param leagueId string
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
// Track ongoing bot drafts to prevent multiple simultaneous calls
const ongoingBotDrafts = new Set<string>();

export async function autoDraftForBot(botId: string, leagueId: string): Promise<{ success: boolean, error?: any }> {
  const draftKey = `${botId}-${leagueId}`;
  
  // Prevent multiple simultaneous drafts for the same bot
  if (ongoingBotDrafts.has(draftKey)) {
    console.log('Bot draft already in progress for:', draftKey);
    return { success: false, error: 'Draft already in progress' };
  }
  
  ongoingBotDrafts.add(draftKey);
  
  try {
    console.log('Auto-drafting for bot:', botId, 'in league:', leagueId);

    // Get highest ELO available player first (most important)
    const { success, player, error: playerError } = await getHighestEloAvailablePlayer(leagueId);
    if (!success || !player) {
      console.error('Player fetch error:', playerError);
      return { success: false, error: playerError };
    }

    console.log('Selected player for bot:', player);

    // First, try to get existing team
    let { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, player_ids')
      .eq('bot_id', botId)
      .eq('league_id', leagueId)
      .single();

    console.log('Existing team check:', { team, teamError });

    // If team doesn't exist, create it
    if (!team) {
      console.log('Creating new team for bot');
      const { data: newTeam, error: createError } = await supabase
        .from('teams')
        .insert({
          bot_id: botId,
          league_id: leagueId,
          player_ids: []
        })
        .select('id, player_ids')
        .single();

      if (createError) {
        console.error('Team creation error:', createError);
        // If creation fails due to conflict, try to get the existing team again
        if (createError.code === '23505') { // Unique violation
          console.log('Team already exists, fetching it');
          const { data: existingTeam, error: fetchError } = await supabase
            .from('teams')
            .select('id, player_ids')
            .eq('bot_id', botId)
            .eq('league_id', leagueId)
            .single();
          
          if (fetchError || !existingTeam) {
            console.error('Failed to fetch existing team:', fetchError);
            return { success: false, error: fetchError || 'Failed to fetch existing team' };
          }
          team = existingTeam;
        } else {
          return { success: false, error: createError };
        }
      } else {
        team = newTeam;
        console.log('Created new team:', team);
      }
    }

    if (!team) {
      console.error('No team found or created');
      return { success: false, error: 'No team found or created' };
    }

    console.log('Bot team:', team);

    // Update bot with team_id if not set
    const { data: bot } = await supabase
      .from('bots')
      .select('team_id')
      .eq('id', botId)
      .single();

    if (bot && !bot.team_id) {
      await supabase
        .from('bots')
        .update({ team_id: team.id })
        .eq('id', botId);
    }

    // Add player to bot's team
    const newPlayerIds = [...(team.player_ids || []), player.id];
    console.log('Updating team with new player IDs:', newPlayerIds);
    
    const { error: teamUpdateError } = await supabase
      .from('teams')
      .update({ player_ids: newPlayerIds })
      .eq('id', team.id);

    if (teamUpdateError) {
      console.error('Team update error:', teamUpdateError);
      return { success: false, error: teamUpdateError };
    }

    console.log('✅ Bot successfully drafted:', player.name);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Auto-draft error:', error);
    return { success: false, error };
  } finally {
    // Always clean up the ongoing draft tracking
    ongoingBotDrafts.delete(draftKey);
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
    console.log('Auto-setting lineup for bot:', botId, 'in league:', leagueId, 'for week:', weekStartDate);
    
    // Get bot's team
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('team_id')
      .eq('id', botId)
      .single();
    
    if (botError || !bot.team_id) {
      console.error('Bot team error:', botError);
      return { success: false, error: botError };
    }
    
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('player_ids')
      .eq('id', bot.team_id)
      .single();
    
    if (teamError || !team.player_ids || team.player_ids.length < 5) {
      console.error('Team error:', teamError, 'player_ids:', team?.player_ids);
      return { success: false, error: teamError };
    }
    
    // Get all players in bot's team, sorted by ELO
    const { data: players, error: playersError } = await supabase
      .from('chess_players')
      .select('*')
      .in('id', team.player_ids)
      .order('elo', { ascending: false });
    
    if (playersError) {
      console.error('Players error:', playersError);
      return { success: false, error: playersError };
    }
    
    // Select top 5 players by ELO
    const top5PlayerIds = players.slice(0, 5).map(p => p.id);
    console.log('Selected top 5 players for bot lineup:', top5PlayerIds);
    
    // First try to get existing lineup
    let { data: existingLineup } = await supabase
      .from('lineups')
      .select('id')
      .eq('bot_id', botId)
      .eq('league_id', leagueId)
      .eq('week_start_date', weekStartDate)
      .single();
    
    if (existingLineup) {
      // Update existing lineup
      const { error: updateError } = await supabase
        .from('lineups')
        .update({
          player_ids: top5PlayerIds,
          total_points: 0
        })
        .eq('id', existingLineup.id);
      
      if (updateError) {
        console.error('Lineup update error:', updateError);
        return { success: false, error: updateError };
      }
    } else {
      // Create new lineup
      const { error: insertError } = await supabase
        .from('lineups')
        .insert({
          bot_id: botId,
          league_id: leagueId,
          week_start_date: weekStartDate,
          player_ids: top5PlayerIds,
          total_points: 0
        });
      
      if (insertError) {
        console.error('Lineup insert error:', insertError);
        return { success: false, error: insertError };
      }
    }
    
    console.log('✅ Bot lineup set successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Auto-set lineup error:', error);
    return { success: false, error };
  }
} 