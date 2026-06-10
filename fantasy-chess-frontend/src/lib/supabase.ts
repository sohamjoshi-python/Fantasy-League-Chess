import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Bot, League } from '../types'
import {
  compareCalendarDates,
  getLeagueLineupWeekBounds,
  mondayYmdToTuesdayDot,
} from './calendarDate'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Ensure a single Supabase client instance in the browser to avoid multiple auth subscriptions
declare global {
  interface Window { __supabaseClient?: SupabaseClient }
}

export const supabase: SupabaseClient = ((): SupabaseClient => {
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  if (!window.__supabaseClient) {
    window.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return window.__supabaseClient
})()

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
 * Titled Tuesday dates (YYYY.MM.DD) for weeks the user has scored lineups in,
 * scoped to the league's start/end season window.
 */
export async function fetchUserLeagueDisplayWeeks(
  userId: string,
  league: Pick<League, 'id' | 'start_date' | 'end_date'>
): Promise<string[]> {
  return fetchLineupParticipantDisplayWeeks({ userId }, league)
}

export async function fetchLineupParticipantDisplayWeeks(
  participant: { userId?: string; botId?: string },
  league: Pick<League, 'id' | 'start_date' | 'end_date'>
): Promise<string[]> {
  const { minMonday, maxMonday } = getLeagueLineupWeekBounds(
    league.start_date,
    league.end_date
  )
  if (compareCalendarDates(minMonday, maxMonday) > 0) {
    return []
  }

  let query = supabase
    .from('lineups')
    .select('week_start_date')
    .eq('league_id', league.id)
    .gte('week_start_date', minMonday)
    .lte('week_start_date', maxMonday)
    .gt('total_points', 0)
    .order('week_start_date', { ascending: true })

  if (participant.botId) {
    query = query.eq('bot_id', participant.botId)
  } else if (participant.userId) {
    query = query.eq('user_id', participant.userId)
  } else {
    return []
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  const uniqueMondays = Array.from(
    new Set(data.map((row) => String(row.week_start_date)))
  )
  return uniqueMondays.map(mondayYmdToTuesdayDot)
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
        
        // First try a targeted query with the correct date format (YYYY.MM.DD).
        const { data: games1, error: error1 } = await supabase
          .from('games')
          .select('*')
          .eq('date', formattedDate)
          .or(`white.eq.${player.player_name},black.eq.${player.player_name}`);

        if (error1) {
          gamesError = error1;
        } else {
          games = games1 || [];
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
  return fetchLineupParticipantBreakdownByRounds({ userId }, leagueId, weekDate)
}

export async function fetchLineupParticipantBreakdownByRounds(
  participant: { userId?: string; botId?: string },
  leagueId: string,
  weekDate: string
): Promise<{
  early: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }>,
  late: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }>
}> {
  try {
    // Convert date format from YYYY-MM-DD to YYYY.MM.DD for games table (games are stored by Tuesday date)
    const formattedDate = weekDate.replace(/-/g, '.');

    // Compute the Monday week_start_date used by lineups from the passed weekDate (which may be Tuesday)
    const [yStr, mStr, dStr] = weekDate.split('-');
    const baseDate = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr)));
    const dow = baseDate.getUTCDay(); // 0 Sunday .. 6 Saturday
    
    // If it's Tuesday (2), go back 1 day to Monday. If it's any other day, find the previous Monday
    let daysToMonday: number;
    if (dow === 2) { // Tuesday
      daysToMonday = 1;
    } else {
      daysToMonday = dow === 0 ? 6 : dow - 1; // distance back to Monday for other days
    }
    
    const mondayUtc = new Date(baseDate);
    mondayUtc.setUTCDate(baseDate.getUTCDate() - daysToMonday);
    const mondayY = mondayUtc.getUTCFullYear();
    const mondayM = String(mondayUtc.getUTCMonth() + 1).padStart(2, '0');
    const mondayD = String(mondayUtc.getUTCDate()).padStart(2, '0');
    const lineupWeekStart = `${mondayY}-${mondayM}-${mondayD}`;
    
    // Removed debug log
    
    // Get participant's lineup for this week (using Monday week_start_date)
    let lineupQuery = supabase
      .from('lineups')
      .select('player_ids')
      .eq('league_id', leagueId)
      .eq('week_start_date', lineupWeekStart)

    if (participant.botId) {
      lineupQuery = lineupQuery.eq('bot_id', participant.botId)
    } else if (participant.userId) {
      lineupQuery = lineupQuery.eq('user_id', participant.userId)
    } else {
      return { early: [], late: [] };
    }

    const { data: lineup, error: lineupError } = await lineupQuery
      .maybeSingle();
    
    if (lineupError || !lineup || !lineup.player_ids || lineup.player_ids.length === 0) {
      return { early: [], late: [] };
    }
    
    // Get player details
    const { data: players, error: playersError } = await supabase
      .from('chess_players')
      .select('id, name')
      .in('id', lineup.player_ids);
    
    if (playersError || !players) {
      console.error('Error fetching players:', playersError);
      return { early: [], late: [] };
    }
    
    // Process each player
    const early: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> = [];
    const late: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> = [];
    
    for (const player of players) {
      // Query each side separately to avoid PostgREST OR encoding issues with chess.com usernames.
      const [{ data: whiteGames, error: whiteGamesError }, { data: blackGames, error: blackGamesError }] = await Promise.all([
        supabase
          .from('games')
          .select('*')
          .eq('date', formattedDate)
          .eq('white', player.name),
        supabase
          .from('games')
          .select('*')
          .eq('date', formattedDate)
          .eq('black', player.name),
      ]);

      if (whiteGamesError || blackGamesError) {
        console.error('Error fetching games for player:', player.name, whiteGamesError || blackGamesError);
        continue;
      }

      const playerGames = [...(whiteGames || []), ...(blackGames || [])];
      
      // Split games by round
      const earlyGames = playerGames.filter(game => game.early_late === 'early');
      const lateGames = playerGames.filter(game => game.early_late === 'late');
      
      // Calculate stats for each round
      const earlyStats = calculateRoundStats(earlyGames, player.name);
      const lateStats = calculateRoundStats(lateGames, player.name);
      
      // Add to results if there are games or points
      if (earlyStats.points > 0 || earlyStats.total_games > 0) {
        early.push({
          player_id: player.id,
          player_name: player.name,
          player_points: earlyStats.points,
          wins: earlyStats.wins,
          total_games: earlyStats.total_games
        });
      }
      
      if (lateStats.points > 0 || lateStats.total_games > 0) {
        late.push({
          player_id: player.id,
          player_name: player.name,
          player_points: lateStats.points,
          wins: lateStats.wins,
          total_games: lateStats.total_games
        });
      }
    }
    
    return { early, late };
  } catch (error) {
    console.error('Error in fetchLineupPlayerBreakdownByRounds:', error);
    return { early: [], late: [] };
  }
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
  
  // Create coin balance record for the bot
  const { error: coinError } = await supabase
    .from('league_coin_balances')
    .insert({
      bot_id: data.id, // Use bot's ID as bot_id
      league_id: leagueId,
      coin_balance: 50, // Start with 50 coins
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  
  if (coinError) {
    console.error('Failed to create bot coin balance:', coinError);
    // Continue anyway - the bot was created successfully
  }
  
  // Note: bot_id column doesn't exist in leagues table, so we skip updating it
  // The bot will be found by league_id in the frontend
  
  return { success: true, bot: data };
}

/**
 * Remove a bot from a league
 * @param botId string
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function removeBot(botId: string): Promise<{ success: boolean, error?: any }> {
  try {
    // First get the bot to find its league_id
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('league_id')
      .eq('id', botId)
      .single();
    
    if (botError) {
      return { success: false, error: botError };
    }

    // Remove bot from bots table
    const { error } = await supabase
      .from('bots')
      .delete()
      .eq('id', botId);
    
    if (error) {
      return { success: false, error };
    }
    
    // Remove bot's coin balance record
    const { error: coinError } = await supabase
      .from('league_coin_balances')
      .delete()
      .eq('bot_id', botId)
      .eq('league_id', bot.league_id);
    
    if (coinError) {
      console.error('Failed to remove bot coin balance:', coinError);
      // Continue anyway - the bot was removed successfully
    }
    
    // Note: bot_id column doesn't exist in leagues table, so we skip clearing it
    // The bot will be found by league_id in the frontend
    
    return { success: true };
  } catch (error) {
    console.error('Error removing bot:', error);
    return { success: false, error };
  }
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
      const participantCount = Math.max(
        league.draft_order?.length ?? 0,
        league.member_ids?.length ?? 0
      );
      const newDraftTurn = league.current_draft_turn + 1;
      const isDraftComplete = participantCount > 0 && newDraftTurn >= participantCount * 10;
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
    const participantCount = Math.max(
      league.draft_order?.length ?? 0,
      league.member_ids?.length ?? 0
    );
    const newDraftTurn = league.current_draft_turn + 1;
    const isDraftComplete = participantCount > 0 && newDraftTurn >= participantCount * 10;
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
    
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('player_ids')
      .eq('bot_id', botId)
      .eq('league_id', leagueId)
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
    console.error('? Auto-set lineup error:', error);
    return { success: false, error };
  }
}

/**
 * Auto-marketplace for a bot using Edge Function (buys highest ELO available player)
 * @param botId string
 * @param leagueId string
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function autoMarketplaceForBot(botId: string, leagueId: string): Promise<{ success: boolean, error?: any, data?: any, debug?: any }> {
  try {
    console.log(`🤖 Calling Edge Function for bot ${botId} in league ${leagueId}`);
    
    // Call the Edge Function instead of local processing
    const response = await supabase.functions.invoke('process-bot-marketplace-turn', {
      body: { botId, leagueId }
    });
    
    console.log('Full response:', response);
    
    if (response.error) {
      // Check if it's a 400 error by looking at the response
      const is400Error = response.response && response.response.status === 400;
      
      if (is400Error) {
        console.log(`⏳ Bot ${botId} turn not ready yet (400 - expected behavior)`);
        console.log('Error response:', response.error);
        console.log('Response data:', response.data);
        
        // Try to extract the response body for debug info
        try {
          if (response.response) {
            const responseText = await response.response.text();
            console.log('Response body:', responseText);
            const responseData = JSON.parse(responseText);
            console.log('Parsed response:', responseData);
            return { success: false, error: 'Bot turn not ready yet', debug: responseData };
          }
        } catch (parseError) {
          console.log('Could not parse response body:', parseError);
        }
        return { success: false, error: 'Bot turn not ready yet', debug: response };
      }
      
      console.error('❌ Edge Function error:', response.error);
      return { success: false, error: response.error.message };
    }
    
    const { data } = response;
    
    if (data && data.success) {
      console.log('✅ Bot marketplace turn completed via Edge Function:', data);
      return { success: true, data };
    } else {
      console.log('⚠️ Edge Function returned non-success response:', data);
      return { success: false, error: data?.error || 'Unknown response from Edge Function' };
    }
  } catch (error) {
    console.error('❌ Error calling Edge Function:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

// Trading System Functions

export async function createTrade(
  leagueId: string,
  sellerId: string,
  playerId: string,
  price: number
): Promise<{ success: boolean, tradeId?: string, error?: any }> {
  try {
    const { data, error } = await supabase.rpc('create_trade', {
      p_league_id: leagueId,
      p_seller_id: sellerId,
      p_player_id: playerId,
      p_price: price
    });

    if (error) throw error;

    return { success: true, tradeId: data };
  } catch (error) {
    console.error('Error creating trade:', error);
    return { success: false, error };
  }
}

export async function acceptTrade(
  tradeId: string,
  buyerId: string
): Promise<{ success: boolean, error?: any }> {
  try {
    const { data, error } = await supabase.rpc('accept_trade', {
      p_trade_id: tradeId,
      p_buyer_id: buyerId
    });

    if (error) throw error;

    return { success: data };
  } catch (error) {
    console.error('Error accepting trade:', error);
    return { success: false, error };
  }
}

export async function cancelTrade(
  tradeId: string,
  userId: string
): Promise<{ success: boolean, error?: any }> {
  try {
    const { data, error } = await supabase.rpc('cancel_trade', {
      p_trade_id: tradeId,
      p_user_id: userId
    });

    if (error) throw error;

    return { success: data };
  } catch (error) {
    console.error('Error cancelling trade:', error);
    return { success: false, error };
  }
}

export async function getUserTrades(
  userId: string,
  leagueId: string
): Promise<{ success: boolean, trades?: any[], error?: any }> {
  try {
    const { data, error } = await supabase.rpc('get_user_trades', {
      p_user_id: userId,
      p_league_id: leagueId
    });

    if (error) throw error;

    return { success: true, trades: data };
  } catch (error) {
    console.error('Error getting user trades:', error);
    return { success: false, error };
  }
}

export async function getTradeNotifications(
  userId: string,
  leagueId: string
): Promise<{ success: boolean, notifications?: any[], error?: any }> {
  try {
    const { data, error } = await supabase.rpc('get_trade_notifications', {
      p_user_id: userId,
      p_league_id: leagueId
    });

    if (error) throw error;

    return { success: true, notifications: data };
  } catch (error) {
    console.error('Error getting trade notifications:', error);
    return { success: false, error };
  }
}

export async function markNotificationSeen(
  notificationId: string
): Promise<{ success: boolean, error?: any }> {
  try {
    const { data, error } = await supabase.rpc('mark_notification_seen', {
      p_notification_id: notificationId
    });

    if (error) throw error;

    return { success: data };
  } catch (error) {
    console.error('Error marking notification as seen:', error);
    return { success: false, error };
  }
}

export async function getAllTrades(
  leagueId: string
): Promise<{ success: boolean, trades?: any[], error?: any }> {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select(`
        *,
        chess_players!inner(name, elo)
      `)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Manually fetch seller and buyer usernames
    const tradesWithUsers = await Promise.all(
      data.map(async (trade) => {
        const [sellerResult, buyerResult] = await Promise.all([
          trade.seller_id ? supabase.from('users').select('username').eq('id', trade.seller_id).single() : Promise.resolve({ data: null }),
          trade.buyer_id ? supabase.from('users').select('username').eq('id', trade.buyer_id).single() : Promise.resolve({ data: null })
        ]);

        return {
          ...trade,
          seller: sellerResult.data ? { username: sellerResult.data.username } : null,
          buyer: buyerResult.data ? { username: buyerResult.data.username } : null
        };
      })
    );

    return { success: true, trades: tradesWithUsers };
  } catch (error) {
    console.error('Error getting all trades:', error);
    return { success: false, error };
  }
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
