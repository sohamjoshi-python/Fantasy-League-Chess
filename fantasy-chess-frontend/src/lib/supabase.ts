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
export async function fetchLineupPlayerBreakdown(userId: string, leagueId: string, weekDate: string): Promise<Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }>> {
  const { data, error } = await supabase.rpc('get_lineup_player_breakdown', {
    user_id_input: userId,
    league_id_input: leagueId,
    week_date_input: weekDate
  });
  if (error) {
    console.error('Error fetching player breakdown:', error);
    return [];
  }

  // Convert date format from YYYY-MM-DD to YYYY.MM.DD for games table
  const formattedDate = weekDate.replace(/-/g, '.');

  // Enhance the data with ranking and win record information
  const enhancedData = await Promise.all(
    data.map(async (player: { player_id: string, player_name: string, player_points: number }) => {
      try {
        
        // Get player's games for this week - try different approaches
        let games = null;
        let gamesError = null;
        
        // First try with the correct date format (YYYY.MM.DD)
        const { data: games1, error: error1 } = await supabase
          .from('games')
          .select('*')
          .eq('date', formattedDate)
          .or(`white.eq.${player.player_name},black.eq.${player.player_name}`);
        
        if (error1) {
          // Try without the OR clause first to see if we get any games
          const { data: games2, error: error2 } = await supabase
            .from('games')
            .select('*')
            .eq('date', formattedDate);
          
          if (error2) {
            gamesError = error2;
          } else {
            // Filter in JavaScript
            games = games2?.filter(game => 
              game.white === player.player_name || game.black === player.player_name
            ) || [];
          }
        } else {
          games = games1;
        }

        if (gamesError) {
          console.error('Error fetching games for player:', player.player_name, gamesError);
          return {
            ...player,
            wins: 0,
            total_games: 0
          };
        }

        // Calculate wins and total games
        let wins = 0;
        let totalGames = 0;
        
        games?.forEach(game => {
          if (game.white === player.player_name || game.black === player.player_name) {
            totalGames++;
            if (game.result === '1-0' && game.white === player.player_name) {
              wins++;
            } else if (game.result === '0-1' && game.black === player.player_name) {
              wins++;
            }
          }
        });

        return {
          ...player,
          wins,
          total_games: totalGames
        };
      } catch (error) {
        console.error('Error enhancing player data:', error);
        return {
          ...player,
          wins: 0,
          total_games: 0
        };
      }
    })
  );

  return enhancedData;
}

/**
 * Fetch the official per-player breakdown for a lineup split by rounds (early/late).
 * @param userId string
 * @param leagueId string
 * @param weekDate string (YYYY-MM-DD)
 * @returns {Promise<{ early: Array<PlayerBreakdown>, late: Array<PlayerBreakdown> }>}
 */
export async function fetchLineupPlayerBreakdownByRounds(userId: string, leagueId: string, weekDate: string): Promise<{ 
  early: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }>, 
  late: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> 
}> {
  const { data, error } = await supabase.rpc('get_lineup_player_breakdown', {
    user_id_input: userId,
    league_id_input: leagueId,
    week_date_input: weekDate
  });
  if (error) {
    console.error('Error fetching player breakdown:', error);
    return { early: [], late: [] };
  }

  // Convert date format from YYYY-MM-DD to YYYY.MM.DD for games table
  const formattedDate = weekDate.replace(/-/g, '.');

  // Enhance the data with round-specific breakdowns
  const enhancedData = await Promise.all(
    data.map(async (player: { player_id: string, player_name: string, player_points: number }) => {
      try {
        
        // Get player's games for this week by round
        const { data: earlyGames, error: earlyError } = await supabase
          .from('games')
          .select('*')
          .eq('date', formattedDate)
          .eq('early_late', 'early')
          .or(`white.eq.${player.player_name},black.eq.${player.player_name}`);
        
        const { data: lateGames, error: lateError } = await supabase
          .from('games')
          .select('*')
          .eq('date', formattedDate)
          .eq('early_late', 'late')
          .or(`white.eq.${player.player_name},black.eq.${player.player_name}`);

        if (earlyError || lateError) {
          // Fallback: get all games and filter
          const { data: allGames, error: allError } = await supabase
            .from('games')
            .select('*')
            .eq('date', formattedDate);
          
          if (allError) {
            console.error('Error fetching all games for player:', player.player_name, allError);
            return {
              player,
              early: { wins: 0, total_games: 0, points: 0 },
              late: { wins: 0, total_games: 0, points: 0 }
            };
          }
          
          // Filter games by round
          const early = allGames?.filter(game => 
            game.early_late === 'early' && (game.white === player.player_name || game.black === player.player_name)
          ) || [];
          const late = allGames?.filter(game => 
            game.early_late === 'late' && (game.white === player.player_name || game.black === player.player_name)
          ) || [];
          
          return {
            player,
            early: calculateRoundStats(early, player.player_name),
            late: calculateRoundStats(late, player.player_name)
          };
        }

        return {
          player,
          early: calculateRoundStats(earlyGames || [], player.player_name),
          late: calculateRoundStats(lateGames || [], player.player_name)
        };
      } catch (error) {
        console.error('Error enhancing player data:', error);
        return {
          player,
          early: { wins: 0, total_games: 0, points: 0 },
          late: { wins: 0, total_games: 0, points: 0 }
        };
      }
    })
  );

  // Split into early and late arrays
  const early: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> = [];
  const late: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> = [];

  enhancedData.forEach(({ player, early: earlyStats, late: lateStats }) => {
    if (earlyStats.points > 0 || earlyStats.total_games > 0) {
      early.push({
        ...player,
        player_points: earlyStats.points,
        wins: earlyStats.wins,
        total_games: earlyStats.total_games
      });
    }
    if (lateStats.points > 0 || lateStats.total_games > 0) {
      late.push({
        ...player,
        player_points: lateStats.points,
        wins: lateStats.wins,
        total_games: lateStats.total_games
      });
    }
  });

  return { early, late };
}

/**
 * Helper function to calculate stats for a round
 */
function calculateRoundStats(games: any[], playerName: string): { wins: number, total_games: number, points: number } {
  let wins = 0;
  let totalGames = 0;
  let points = 0;
  
  games.forEach(game => {
    if (game.white === playerName || game.black === playerName) {
      totalGames++;
      if (game.result === '1-0' && game.white === playerName) {
        wins++;
        points += game.white_points || 0;
      } else if (game.result === '0-1' && game.black === playerName) {
        wins++;
        points += game.black_points || 0;
      } else if (game.white === playerName) {
        points += game.white_points || 0;
      } else if (game.black === playerName) {
        points += game.black_points || 0;
      }
    }
  });

  return { wins, total_games: totalGames, points };
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
      // If some players are drafted, get all players and filter in JavaScript
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
    return { success: false, error: 'Draft already in progress' };
  }
  
  ongoingBotDrafts.add(draftKey);
  
  try {
    
    // --- Get league info for draft order and turn logic ---
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, draft_order, current_draft_turn, draft_completed, member_ids, bot_id')
      .eq('id', leagueId)
      .single();
    if (leagueError || !league) {
      console.error('Failed to fetch league:', leagueError);
      return { success: false, error: leagueError || 'No league found' };
    }

    // Check if it's the bot's turn
    const currentDraftUserId = league.draft_order[league.current_draft_turn];
    if (currentDraftUserId !== botId) {
      return { success: false, error: 'Not bot\'s turn' };
    }

    // --- Get or create bot team ---
    let { data: team } = await supabase
      .from('teams')
      .select('id, player_ids')
      .eq('bot_id', botId)
      .eq('league_id', leagueId)
      .single();

    if (!team) {
      const { data: newTeam, error: createError } = await supabase
        .from('teams')
        .insert({ bot_id: botId, league_id: leagueId, player_ids: [] })
        .select('id, player_ids')
        .single();
      if (createError) {
        if (createError.code === '23505') {
          const { data: existingTeam, error: fetchError } = await supabase
            .from('teams')
            .select('id, player_ids')
            .eq('bot_id', botId)
            .eq('league_id', leagueId)
            .single();
          if (fetchError || !existingTeam) {
            return { success: false, error: fetchError || 'Failed to fetch existing team' };
          }
          team = existingTeam;
        } else {
          return { success: false, error: createError };
        }
      } else {
        team = newTeam;
      }
    }

    // --- Enforce max team size ---
    if ((team.player_ids?.length || 0) >= 10) {
      // Advance draft turn and check for completion
      const totalDraftParticipants = league.member_ids.length + (league.bot_id ? 1 : 0);
      const newDraftTurn = league.current_draft_turn + 1;
      const isDraftComplete = newDraftTurn >= totalDraftParticipants * 10;
      const { error: leagueUpdateError } = await supabase
        .from('leagues')
        .update({
          current_draft_turn: newDraftTurn,
          draft_completed: isDraftComplete
        })
        .eq('id', leagueId);
      if (leagueUpdateError) {
        return { success: false, error: leagueUpdateError };
      }
      return { success: true };
    }

    // --- Get highest ELO available player ---
    const { success, player, error: playerError } = await getHighestEloAvailablePlayer(leagueId);
    if (!success || !player) {
      return { success: false, error: playerError };
    }

    // --- Add player to bot's team ---
    const newPlayerIds = [...(team.player_ids || []), player.id];
    const { error: teamUpdateError } = await supabase
      .from('teams')
      .update({ player_ids: newPlayerIds })
      .eq('id', team.id);
    if (teamUpdateError) {
      return { success: false, error: teamUpdateError };
    }

    // --- Advance draft turn and check for completion ---
    const totalDraftParticipants = league.member_ids.length + (league.bot_id ? 1 : 0);
    const newDraftTurn = league.current_draft_turn + 1;
    const isDraftComplete = newDraftTurn >= totalDraftParticipants * 10;
    const { error: leagueUpdateError } = await supabase
      .from('leagues')
      .update({
        current_draft_turn: newDraftTurn,
        draft_completed: isDraftComplete
      })
      .eq('id', leagueId);
    if (leagueUpdateError) {
      return { success: false, error: leagueUpdateError };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error };
  } finally {
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
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Auto-set lineup error:', error);
    return { success: false, error };
  }
}

// Notification functions
export async function fetchNotifications(): Promise<{ success: boolean, notifications?: any[], error?: any }> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true, notifications: data };
}

export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean, error?: any }> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true };
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean, error?: any }> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true };
}

export async function deleteNotification(notificationId: string): Promise<{ success: boolean, error?: any }> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true };
}

export async function getUnreadNotificationCount(): Promise<{ success: boolean, count?: number, error?: any }> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  
  if (error) {
    return { success: false, error };
  }
  
  return { success: true, count: count || 0 };
} 

// Temporary debug: expose a function to get the current Supabase session JWT
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.getSupabaseSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  };
} 

// Temporary debug: expose a function to get all leagues from the schema
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.debugGetLeagues = async () => {
    const { data, error } = await supabase.from('leagues').select('*');
    if (error) {
      console.error('Error fetching leagues:', error);
    }
    return { data, error };
  };
} 

// Temporary debug: expose a function to get all teams from the schema
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.debugGetTeams = async () => {
    const { data, error } = await supabase.from('teams').select('*');
    if (error) {
      console.error('Error fetching teams:', error);
    }
    return { data, error };
  };
} 