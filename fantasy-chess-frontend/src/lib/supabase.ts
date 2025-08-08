import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Bot } from '../types'

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
    
    console.log('Date conversion:', { weekDate, formattedDate, lineupWeekStart, dow });
    
    // Get user's lineup for this week (using Monday week_start_date)
    const { data: lineup, error: lineupError } = await supabase
      .from('lineups')
      .select('player_ids')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .eq('week_start_date', lineupWeekStart)
      .maybeSingle();
    
    if (lineupError || !lineup || !lineup.player_ids || lineup.player_ids.length === 0) {
      console.error('No lineup found for user:', userId, 'week:', weekDate, 'error:', lineupError);
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
    
    // Get all games for this week
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .eq('date', formattedDate);
    
    if (gamesError) {
      console.error('Error fetching games:', gamesError);
      return { early: [], late: [] };
    }
    
    // Process each player
    const early: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> = [];
    const late: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> = [];
    
    for (const player of players) {
      // Filter games for this player
      const playerGames = games?.filter(game => 
        game.white === player.name || game.black === player.name
      ) || [];
      
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
    console.error('? Auto-set lineup error:', error);
    return { success: false, error };
  }
}

/**
 * Auto-marketplace for a bot (buys highest ELO available player)
 * @param botId string
 * @param leagueId string
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function autoMarketplaceForBot(botId: string, leagueId: string): Promise<{ success: boolean, error?: any }> {
  const draftKey = `${botId}-${leagueId}`;
  
  // Prevent concurrent drafts for the same bot
  if (ongoingBotDrafts.has(draftKey)) {
    return { success: false, error: 'Bot is already processing a marketplace action' };
  }
  
  ongoingBotDrafts.add(draftKey);
  
  // --- Calculate player price based on ELO ---
  const calculatePlayerPrice = (elo: number): number => {
    if (elo >= 3000) return 50;      // World Champion level
    if (elo >= 2800) return 45;      // Super GM level
    if (elo >= 2600) return 40;      // GM level
    if (elo >= 2400) return 35;      // IM level
    if (elo >= 2200) return 30;      // FM level
    if (elo >= 2000) return 25;      // Expert level
    if (elo >= 1800) return 20;      // Class A
    if (elo >= 1600) return 15;      // Class B
    if (elo >= 1400) return 10;      // Class C
    return 5;                         // Beginner
  };
  
  try {
    // --- Get league info for marketplace order and turn logic ---
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, marketplace_order, current_marketplace_turn, marketplace_completed, member_ids')
      .eq('id', leagueId)
      .single();
    if (leagueError || !league) {
      console.error('Failed to fetch league:', leagueError);
      return { success: false, error: leagueError || 'No league found' };
    }

    // Check if it's the bot's turn
    const currentMarketplaceUserId = league.marketplace_order[league.current_marketplace_turn];
    if (currentMarketplaceUserId !== botId) {
      return { success: false, error: 'Not bot\'s turn' };
    }

    // --- Get bot's coin balance ---
    const { data: botBalance, error: balanceError } = await supabase
      .from('league_coin_balances')
      .select('coin_balance')
      .eq('bot_id', botId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (balanceError || !botBalance) {
      console.error('Failed to fetch bot balance:', balanceError);
      return { success: false, error: 'Failed to fetch bot balance' };
    }

    const botCoins = botBalance.coin_balance || 0;

    // --- Get or create bot team ---
    let { data: team } = await supabase
      .from('teams')
      .select('id, player_ids')
      .eq('bot_id', botId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (!team) {
      // Try to create a team for the bot
      const { data: newTeam, error: createError } = await supabase
        .from('teams')
        .insert({ 
          bot_id: botId, 
          league_id: leagueId, 
          player_ids: [],
          created_at: new Date().toISOString()
        })
        .select('id, player_ids')
        .single();
      
      if (createError) {
        console.error('Failed to create bot team:', createError);
        // If we can't create a team, just skip the turn
        const newMarketplaceTurn = league.current_marketplace_turn + 1;
        const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length;
        const { error: leagueUpdateError } = await supabase
          .from('leagues')
          .update({
            current_marketplace_turn: newMarketplaceTurn,
            marketplace_completed: isMarketplaceComplete
          })
          .eq('id', leagueId);
        if (leagueUpdateError) {
          return { success: false, error: leagueUpdateError };
        }
        return { success: true };
      }
      team = newTeam;
    }

    // --- Enforce max team size ---
    if ((team.player_ids?.length || 0) >= 10) {
      // Bot team is full, skip turn
      const newMarketplaceTurn = league.current_marketplace_turn + 1;
      const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length;
      const { error: leagueUpdateError } = await supabase
        .from('leagues')
        .update({
          current_marketplace_turn: newMarketplaceTurn,
          marketplace_completed: isMarketplaceComplete
        })
        .eq('id', leagueId);
      if (leagueUpdateError) {
        return { success: false, error: leagueUpdateError };
      }
      return { success: true };
    }

    // --- Get best available player the bot can afford ---
    const getBestAffordablePlayer = async (leagueId: string, maxPrice: number): Promise<{ success: boolean, player?: any, error?: any }> => {
      try {
        // Searching for players with max price ${maxPrice} coins
        
        // Get all drafted players in this league
        const { data: draftedPlayers, error: draftedError } = await supabase
          .from('teams')
          .select('player_ids')
          .eq('league_id', leagueId);
        
        if (draftedError) {
          console.error('Error fetching drafted players:', draftedError);
          return { success: false, error: draftedError };
        }
        
        // Flatten all drafted player IDs
        const draftedPlayerIds = draftedPlayers?.flatMap(team => team.player_ids || []) || [];
        
        // Get all players and filter by price and availability
        const { data: allPlayers, error } = await supabase
          .from('chess_players')
          .select('*')
          .order('elo', { ascending: false }); // Start with highest ELO (best players first)
        
        if (error) {
          console.error('Error fetching all players:', error);
          return { success: false, error };
        }
        
        // Find the best available player the bot can afford
        for (const player of allPlayers || []) {
          if (draftedPlayerIds.includes(player.id)) {
            continue; // Skip already drafted players
          }
          
          const playerPrice = calculatePlayerPrice(player.elo || 0);
          
          
          if (playerPrice <= maxPrice) {
            
            return { success: true, player };
          }
        }
        
        
        return { success: false, error: 'No affordable players found' };
      } catch (error) {
        console.error('Error in getCheapestAvailablePlayer:', error);
        return { success: false, error };
      }
    };

    const { success, player } = await getBestAffordablePlayer(leagueId, botCoins);
    if (!success || !player) {
      
      // Bot can't afford any players, check if marketplace should end
      const remainingPlayerIds = league.marketplace_order.slice(league.current_marketplace_turn);
      const { data: remainingBalances, error: balanceCheckError } = await supabase
        .from('league_coin_balances')
        .select('user_id, bot_id, coin_balance')
        .or(`user_id.in.(${remainingPlayerIds.join(',')}),bot_id.in.(${remainingPlayerIds.join(',')})`)
        .eq('league_id', leagueId);
      
      if (!balanceCheckError && remainingBalances) {
        // Check if all remaining players have insufficient coins
        const allPlayersHaveNoCoins = remainingPlayerIds.every((playerId: string) => {
          const balance = remainingBalances.find(b => b.user_id === playerId || b.bot_id === playerId);
          return !balance || balance.coin_balance < 5; // Minimum player price is 5 coins
        });
        
        if (allPlayersHaveNoCoins) {
          
          // End the marketplace
          const { error: leagueUpdateError } = await supabase
            .from('leagues')
            .update({
              marketplace_completed: true
            })
            .eq('id', leagueId);
          if (leagueUpdateError) {
            return { success: false, error: leagueUpdateError };
          }
          return { success: true };
        }
      }
      
      // Just skip this bot's turn
      const newMarketplaceTurn = league.current_marketplace_turn + 1;
      const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length;
      const { error: leagueUpdateError } = await supabase
        .from('leagues')
        .update({
          current_marketplace_turn: newMarketplaceTurn,
          marketplace_completed: isMarketplaceComplete
        })
        .eq('id', leagueId);
      if (leagueUpdateError) {
        return { success: false, error: leagueUpdateError };
      }
      return { success: true };
    }

    // --- Check if bot has enough coins for this player ---
    const playerPrice = calculatePlayerPrice(player.elo || 0);
    
    
    if (botCoins < playerPrice) {
      
      
      // Check if all remaining players in the marketplace order have 0 coins
      const remainingPlayerIds = league.marketplace_order.slice(league.current_marketplace_turn);
      const { data: remainingBalances, error: balanceCheckError } = await supabase
        .from('league_coin_balances')
        .select('user_id, bot_id, coin_balance')
        .or(`user_id.in.(${remainingPlayerIds.join(',')}),bot_id.in.(${remainingPlayerIds.join(',')})`)
        .eq('league_id', leagueId);
      
      if (balanceCheckError) {
        console.error('Failed to check remaining balances:', balanceCheckError);
        // Fall back to just skipping turn
        const newMarketplaceTurn = league.current_marketplace_turn + 1;
        const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length;
        const { error: leagueUpdateError } = await supabase
          .from('leagues')
          .update({
            current_marketplace_turn: newMarketplaceTurn,
            marketplace_completed: isMarketplaceComplete
          })
          .eq('id', leagueId);
        if (leagueUpdateError) {
          return { success: false, error: leagueUpdateError };
        }
        return { success: true };
      }
      
      // Check if all remaining players have 0 or insufficient coins
      const allPlayersHaveNoCoins = remainingPlayerIds.every((playerId: string) => {
        const balance = remainingBalances?.find(b => b.user_id === playerId || b.bot_id === playerId);
        const hasEnoughCoins = balance && balance.coin_balance >= 5; // Minimum player price is 5 coins
        
        return !hasEnoughCoins;
      });
      
      if (allPlayersHaveNoCoins) {
        
        // End the marketplace
        const { error: leagueUpdateError } = await supabase
          .from('leagues')
          .update({
            marketplace_completed: true
          })
          .eq('id', leagueId);
        if (leagueUpdateError) {
          console.error('Failed to update marketplace_completed:', leagueUpdateError);
          return { success: false, error: leagueUpdateError };
        }
        
        return { success: true };
      } else {
        
        // Just skip this bot's turn
        const newMarketplaceTurn = league.current_marketplace_turn + 1;
        const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length;
        const { error: leagueUpdateError } = await supabase
          .from('leagues')
          .update({
            current_marketplace_turn: newMarketplaceTurn,
            marketplace_completed: isMarketplaceComplete
          })
          .eq('id', leagueId);
        if (leagueUpdateError) {
          return { success: false, error: leagueUpdateError };
        }
        return { success: true };
      }
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

    // --- Deduct coins from bot's balance ---
    const { error: coinUpdateError } = await supabase
      .from('league_coin_balances')
      .update({ 
        coin_balance: botCoins - playerPrice,
        updated_at: new Date().toISOString()
      })
      .eq('bot_id', botId)
      .eq('league_id', leagueId);
    if (coinUpdateError) {
      return { success: false, error: coinUpdateError };
    }

    // --- Advance marketplace turn and check for completion ---
    const newMarketplaceTurn = league.current_marketplace_turn + 1;
    const isMarketplaceComplete = newMarketplaceTurn >= league.marketplace_order.length;
    const { error: leagueUpdateError } = await supabase
      .from('leagues')
      .update({
        current_marketplace_turn: newMarketplaceTurn,
        marketplace_completed: isMarketplaceComplete
      })
      .eq('id', leagueId);
    if (leagueUpdateError) {
      return { success: false, error: leagueUpdateError };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in autoMarketplaceForBot:', error);
    return { success: false, error };
  } finally {
    ongoingBotDrafts.delete(draftKey);
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
