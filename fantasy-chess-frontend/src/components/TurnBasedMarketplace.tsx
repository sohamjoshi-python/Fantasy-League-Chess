import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { autoMarketplaceForBot } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChessPlayer, League, CurrentMarketplaceTurn, MarketplaceTurn } from '../types';
import { calculatePlayerPrice, getPlayerTier } from '../types/coin-system';

interface TurnBasedMarketplaceProps {
  league: League;
  onUpdate: () => void;
}

// Helper function to generate snake draft order
function generateSnakeDraftOrder(participants: string[], rounds: number): string[] {
  const order: string[] = [];
  
  // For each round (0-9), add all participants in snake order
  for (let round = 0; round < rounds; round++) {
    if (round % 2 === 0) {
      // Even rounds: forward order (1, 2, 3, ...)
      for (let i = 0; i < participants.length; i++) {
        order.push(participants[i]);
      }
    } else {
      // Odd rounds: reverse order (3, 2, 1, ...)
      for (let i = participants.length - 1; i >= 0; i--) {
        order.push(participants[i]);
      }
    }
  }
  
  return order;
}

export default function TurnBasedMarketplace({ league, onUpdate }: TurnBasedMarketplaceProps) {
  const { user } = useAuth();
  const [currentTurn, setCurrentTurn] = useState<CurrentMarketplaceTurn | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<ChessPlayer[]>([]);
  const [userTeam, setUserTeam] = useState<ChessPlayer[]>([]);
  const [userCoinBalance, setUserCoinBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnHistory, setTurnHistory] = useState<MarketplaceTurn[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<ChessPlayer | null>(null);
  const [showBuyConfirmation, setShowBuyConfirmation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastActionTime, setLastActionTime] = useState(0);
  // Add state for draft completed - check both league state and marketplace order
  const [marketplaceDraftCompleted, setMarketplaceDraftCompleted] = useState(
    league.draft_completed || 
    (league.marketplace_order && league.marketplace_order.length === 0)
  );

  const isOwner = user?.id && league && user.id === league?.creator_id;
  const isUserTurn = currentTurn?.current_user_id === user?.id;
  const maxPlayers = league.max_players_per_team || 10;
  const userTeamSize = userTeam.length;
  const canBuy = userTeamSize < maxPlayers;

  // Helper: Check if marketplace is open (Wednesday 1 AM to Monday 11:59 PM PT)
  function isMarketplaceOpen() {
    // TEMPORARILY DISABLED: Always return true to keep marketplace open
    return true;
    
    // Original logic (commented out for now):
    // const now = new Date();
    // const nowPT = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    // const day = nowPT.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    // const hour = nowPT.getHours();
    // // Open: Wed 1:00 AM (day=3, hour>=1) through Mon 11:59 PM (day=1, hour<=23)
    // if (day === 3 && hour >= 1) return true; // Wednesday after 1 AM
    // if (day > 3 && day <= 6) return true; // Thursday, Friday, Saturday
    // if (day === 0) return true; // Sunday
    // if (day === 1 && hour <= 23) return true; // Monday all day
    // return false;
  }



  useEffect(() => {
    if (league?.id) {
      loadCurrentTurn();
      loadAvailablePlayers();
      loadUserTeam();
      loadUserCoinBalance();
      loadTurnHistory();
      
      // Update marketplace completion state
      setMarketplaceDraftCompleted(
        league.marketplace_completed || 
        league.draft_completed || 
        (league.marketplace_order && league.marketplace_order.length === 0)
      );
    }
  }, [league?.id, league?.current_marketplace_turn, league?.draft_completed, league?.marketplace_order, league?.marketplace_completed]);

  // Remove the auto-skip useEffect entirely

  const loadCurrentTurn = async () => {
    try {
      // Don't process if marketplace is already completed
      if (league.marketplace_completed) {
        // Marketplace is already completed, skip processing
        return;
      }
      
      // Calculate current turn info from league data
      if (league.marketplace_order && league.marketplace_order.length > 0) {
        const currentTurnIndex = league.current_marketplace_turn || 0;
        const currentUserId = league.marketplace_order[currentTurnIndex];
        
        if (currentUserId) {
          setCurrentTurn({
            current_user_id: currentUserId,
            turn_number: currentTurnIndex,
            total_turns: league.marketplace_order.length,
            is_completed: false,
            user_team_size: 0 // Will be calculated separately
          });
          
          // Check if current user is a bot and auto-process their turn
          const { data: botData } = await supabase
            .from('bots')
            .select('id')
            .eq('id', currentUserId)
            .maybeSingle();
          
          if (botData) {
            // Bot turn detected, auto-process marketplace action
            try {
              if (currentTurn) {
                await autoMarketplaceForBot(league.id, currentTurn.current_user_id);
              }
            } catch (error) {
              // Bot marketplace action failed
            }
          } else {
            // Check if current user has 0 coins and auto-skip if needed
            await checkAndAutoSkipIfNoCoins(currentUserId);
          }
        } else {
          setCurrentTurn(null);
        }
      } else {
        setCurrentTurn(null);
      }
    } catch (err) {
      console.error('Error loading current turn:', err);
      setCurrentTurn(null);
    }
  };

  // Patch: Filter out already owned players from availablePlayers
  const loadAvailablePlayers = async () => {
    try {
      // Fetch all players using pagination
      let allPlayers: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: players, error: playersError } = await supabase
          .from('chess_players')
          .select('*')
          .order('elo', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (playersError) throw playersError;

        if (players && players.length > 0) {
          allPlayers = allPlayers.concat(players);
          page++;
        } else {
          hasMore = false;
        }

        // Safety check to prevent infinite loops
        if (page > 10) {
          console.warn('Reached maximum page limit, stopping pagination');
          hasMore = false;
        }
      }

      // Get all teams in this league to see which players are already owned
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('league_id', league.id);

      if (teamsError) throw teamsError;

      // Create set of owned player IDs in this league
      const ownedPlayerIds = new Set<string>();
      allTeams?.forEach(team => {
        team.player_ids?.forEach((id: string) => ownedPlayerIds.add(id));
      });

      // Filter out owned players
      const available = allPlayers.filter(player => !ownedPlayerIds.has(player.id));
      
      setAvailablePlayers(available);
    } catch (err) {
      console.error('Error loading available players:', err);
    }
  };

  const loadUserTeam = async () => {
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('user_id', user?.id)
        .eq('league_id', league.id)
        .limit(1)
        .maybeSingle();

      if (teamError) {
        // Team query failed (using empty team)
        setUserTeam([]);
        return;
      }

      if (teamData && teamData.player_ids && teamData.player_ids.length > 0) {
        const { data: teamPlayers, error: teamPlayersError } = await supabase
          .from('chess_players')
          .select('*')
          .in('id', teamData.player_ids);

        if (teamPlayersError) {
          // Team players query failed
          setUserTeam([]);
        } else {
          setUserTeam(teamPlayers || []);
        }
      } else {
        setUserTeam([]);
      }
    } catch (error) {
      // Load user team failed
      setUserTeam([]);
    }
  };

  const loadUserCoinBalance = async () => {
    if (!user?.id) {
      setUserCoinBalance(50);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('league_coin_balances')
        .select('coin_balance')
        .eq('user_id', user.id)
        .eq('league_id', league.id)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No coin balance record exists, create it
          try {
            const { error: insertError } = await supabase
              .from('league_coin_balances')
              .insert([
                {
                  user_id: user.id,
                  league_id: league.id,
                  coin_balance: 50,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]);
            if (insertError) {
              console.error('Failed to create coin balance:', insertError);
              // If it's a duplicate key error (409), just set the balance to 50
              if (insertError.code === '23505') {
                setUserCoinBalance(50);
              } else {
                setUserCoinBalance(50); // Default to 50 coins
              }
            } else {
              setUserCoinBalance(50); // Default to 50 coins after creation
            }
          } catch (insertErr) {
            // Coin balance insert failed (using default)
          }
        } else {
          // Coin balance query failed (using default)
          setUserCoinBalance(50); // Default to 50 coins on error
        }
      } else {
        setUserCoinBalance(data?.coin_balance || 0);
      }
    } catch (err) {
      // Coin balance load failed (using default)
      setUserCoinBalance(50); // Default to 50 coins on error
    }
  };

  const checkAndAutoSkipIfNoCoins = async (userId: string) => {
    try {
      // Only check if it's not the current user's turn (to avoid infinite loops)
      if (userId === user?.id) {
        return;
      }
      
      // Get the user's coin balance for this league
      const { data: coinBalanceData, error: coinError } = await supabase
        .from('league_coin_balances')
        .select('coin_balance')
        .eq('user_id', userId)
        .eq('league_id', league.id)
        .limit(1)
        .maybeSingle();
      
      if (coinError) {
        return;
      }
      
      const coinBalance = coinBalanceData?.coin_balance || 0;
      
      // If user has 0 coins, check if all remaining players also have 0 coins
      if (coinBalance <= 0) {
        // Get all remaining players in the marketplace order
        const currentOrder = league.marketplace_order || [];
        const currentTurnIndex = league.current_marketplace_turn || 0;
        const remainingPlayerIds = currentOrder.slice(currentTurnIndex);
        
        // Get coin balances for all remaining players
        const { data: remainingBalances, error: balanceCheckError } = await supabase
          .from('league_coin_balances')
          .select('user_id, bot_id, coin_balance')
          .or(`user_id.in.(${remainingPlayerIds.join(',')}),bot_id.in.(${remainingPlayerIds.join(',')})`)
          .eq('league_id', league.id);
        
        if (!balanceCheckError && remainingBalances) {
          // Check if all remaining players have 0 or insufficient coins
          const allPlayersHaveNoCoins = remainingPlayerIds.every((playerId: string) => {
            const balance = remainingBalances.find(b => b.user_id === playerId || b.bot_id === playerId);
            return !balance || balance.coin_balance < 5; // Minimum player price is 5 coins
          });
          
          if (allPlayersHaveNoCoins) {
            // All remaining players have insufficient coins, ending marketplace
            // End the marketplace by updating the league
            const { error: leagueUpdateError } = await supabase
              .from('leagues')
              .update({
                marketplace_completed: true
              })
              .eq('id', league.id);
            if (leagueUpdateError) {
              throw leagueUpdateError;
            }
            onUpdate();
          }
        }
        
        // If not all players have 0 coins, just skip this user's turn
        await handleSkipForUser(userId);
      }
    } catch (err) {
      console.error('Error checking coin balance for auto-skip:', err);
    }
  };

  const handleSkipForUser = async (userId: string) => {
    try {
      const currentOrder = league.marketplace_order || [];
      
      // Remove the user from the marketplace order
      const newOrder = currentOrder.filter(id => id !== userId);
      
      // When a user skips, we need to handle the turn index properly
      // The current user is being removed, so we need to find the next user
      let newTurnIndex = league.current_marketplace_turn || 0;
      
      // If the current turn index is at the end or beyond the new order length, reset to 0
      if (newTurnIndex >= newOrder.length) {
        newTurnIndex = 0;
      }
      
      // If there are no more users in the order, mark as completed
      const isCompleted = newOrder.length === 0;
      
      // If completed, set turn index to 0, otherwise keep the current index
      if (isCompleted) {
        newTurnIndex = 0;
      }
      
      // Update the database
      const { data: updateData, error: updateError } = await supabase
        .from('leagues')
        .update({
          marketplace_order: newOrder,
          current_marketplace_turn: newTurnIndex,
          marketplace_completed: isCompleted
        })
        .eq('id', league.id)
        .select();

      if (updateError) {
        console.error('🔄 Database update failed:', updateError);
        throw updateError;
      }
      
      if (!updateData || updateData.length === 0) {
        console.error('🔄 Database update returned no data - possible RLS issue');
        throw new Error('Database update failed - no data returned');
      }
      
      // Refresh the league data
      setTimeout(() => {
        onUpdate();
      }, 500);
    } catch (err) {
      console.error('Error auto-skipping turn for user:', err);
    }
  };

  const loadTurnHistory = async () => {
    // For now, we'll skip loading turn history since the table might not exist
    // This can be implemented later if needed
    setTurnHistory([]);
  };

  const startMarketplace = async () => {
    if (!isOwner) return;
    
    try {
      setLoading(true);
      setError(null);

      // Get all league members (users and bots) from leagues.member_ids
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('member_ids')
        .eq('id', league.id)
        .single();

      if (leagueError) {
        console.error('Failed to fetch league data:', leagueError);
        throw leagueError;
      }

      if (!leagueData.member_ids || leagueData.member_ids.length < 2) {
        console.error('Not enough participants for snake draft. Need at least 2, got:', leagueData.member_ids?.length);
        setError('Need at least 2 league members to start a snake draft');
        return;
      }
      
      // Use the member_ids array directly
      const participantIds = leagueData.member_ids;
      const fullDraftOrder = generateSnakeDraftOrder(participantIds, 10);
      
      // Update league with marketplace settings
      const { error } = await supabase
        .from('leagues')
        .update({
          marketplace_started: true,
          marketplace_start_time: new Date().toISOString(),
          marketplace_order: fullDraftOrder,
          current_marketplace_turn: 0,
          marketplace_completed: false
        })
        .eq('id', league.id);
      
      if (error) {
        console.error('Failed to start marketplace:', error);
        throw error;
      }
      
      onUpdate();
    } catch (err) {
      console.error('Failed to start marketplace:', err);
      setError(`Failed to start marketplace: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const buyPlayer = async (playerId: string, price: number) => {
    if (!isUserTurn || !canBuy || !user?.id || loading) return;

    // Prevent rapid clicks (debounce)
    const now = Date.now();
    if (now - lastActionTime < 2000) { // 2 second cooldown
      return;
    }
    setLastActionTime(now);

    try {
      setLoading(true);
      setError(null);

      // Fetch the current team row
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, player_ids')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .single();

      if (teamError) {
        console.error('❌ Team fetch error:', teamError);
        throw teamError;
      }

      // Add the new player to the array
      const newPlayerIds = [...(team.player_ids || []), playerId];

      // Update the team row
      const { error: updateError } = await supabase
        .from('teams')
        .update({ player_ids: newPlayerIds })
        .eq('id', team.id);

      if (updateError) {
        console.error('❌ Team update error:', updateError);
        throw updateError;
      }

      // Deduct coins from user's balance
      const { error: coinError } = await supabase
        .from('league_coin_balances')
        .update({ 
          coin_balance: userCoinBalance - price,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('league_id', league.id);

      if (coinError) {
        console.error('❌ Coin deduction error:', coinError);
        throw coinError;
      }

      // Advance to next turn
      const { error: turnError } = await supabase
        .from('leagues')
        .update({ 
          current_marketplace_turn: (league.current_marketplace_turn || 0) + 1
        })
        .eq('id', league.id);

      if (turnError) {
        console.error('❌ Turn advancement error:', turnError);
        throw turnError;
      }

      // Reload team, available players, and coin balance
      await loadUserTeam();
      await loadAvailablePlayers();
      await loadUserCoinBalance();
      onUpdate();
      
    } catch (err: any) {
      console.error('❌ Error buying player:', err);
      console.error('Error details:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      });
      setError('Failed to buy player');
    } finally {
      setLoading(false);
    }
  };



  // Handle skip logic
  const handleSkip = async () => {
    if (!user?.id || loading) return;

    // Prevent rapid clicks (debounce)
    const now = Date.now();
    if (now - lastActionTime < 2000) { // 2 second cooldown
      // Action too soon, please wait...
      return;
    }
    setLastActionTime(now);

    setLoading(true);
    try {
      // Skipping turn...
      
      // Remove user from marketplace order
      const currentOrder = league.marketplace_order || [];
      const newOrder = currentOrder.filter(id => id !== user.id);
      
      // When a user skips, we need to handle the turn index properly
      // The current user is being removed, so we need to find the next user
      let newTurnIndex = league.current_marketplace_turn || 0;
      
      // If the current turn index is at the end or beyond the new order length, reset to 0
      if (newTurnIndex >= newOrder.length) {
        newTurnIndex = 0;
      }
      
      // If there are no more users in the order, mark as completed
      const isCompleted = newOrder.length === 0;
      
      // If completed, set turn index to 0, otherwise keep the current index
      if (isCompleted) {
        newTurnIndex = 0;
      }
      
      // Current order: ${currentOrder}
      // New order after removing user: ${newOrder}
      // Current turn index: ${league.current_marketplace_turn}
      // User being removed: ${user.id}
      // New turn index will be: ${newTurnIndex}
      // Will be completed: ${isCompleted}
      
      // Updating database with new order: ${newOrder}
      // New turn index: ${newTurnIndex}
      // Will be completed: ${isCompleted}
      
      const { data: updateData, error: updateError } = await supabase
        .from('leagues')
        .update({
          marketplace_order: newOrder,
          current_marketplace_turn: newTurnIndex,
          marketplace_completed: isCompleted
        })
        .eq('id', league.id)
        .select();

      // Database update result: ${updateData}, ${updateError}
      
      if (updateError) {
        console.error('🔄 Database update failed:', updateError);
        throw updateError;
      }
      
      if (!updateData || updateData.length === 0) {
        console.error('🔄 Database update returned no data - possible RLS issue');
        throw new Error('Database update failed - no data returned');
      }
      
      // Turn skipped successfully
      
      // Add a delay to ensure the database update is reflected
      setTimeout(() => {
        // Calling onUpdate() after delay
        onUpdate();
      }, 500);
    } catch (err) {
      console.error('Error skipping turn:', err);
      setError('Failed to skip turn');
    } finally {
      setLoading(false);
    }
  };



  const getPlayerDetails = (username: string) => {
    return availablePlayers.find(p => p.name === username);
  };

  const filteredPlayers = availablePlayers
    .filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const priceA = calculatePlayerPrice(a.elo);
      const priceB = calculatePlayerPrice(b.elo);
      const canAffordA = userCoinBalance !== null && userCoinBalance >= priceA;
      const canAffordB = userCoinBalance !== null && userCoinBalance >= priceB;
      
      // Sort by affordability first (affordable players first)
      if (canAffordA && !canAffordB) return -1;
      if (!canAffordA && canAffordB) return 1;
      
      // Then sort by ELO (highest first)
      return b.elo - a.elo;
    });

  if (!league.marketplace_started) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Turn-Based Marketplace</h3>
        <p className="text-gray-600 mb-4">
          The marketplace allows players to take turns buying chess players. Each player can have up to {league.max_players_per_team || 10} players on their team.
        </p>
        
        {isOwner && (
          <div className="space-y-4">
            <button
              onClick={startMarketplace}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Starting Marketplace...' : 'Start Turn-Based Marketplace'}
            </button>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>
        )}
        
        {!isOwner && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            Waiting for the league owner to start the marketplace...
          </div>
        )}
      </div>
    );
  }

  if (league.marketplace_completed || league.draft_completed || (league.marketplace_order && league.marketplace_order.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          {league.marketplace_completed ? 'Marketplace Complete!' : 'Draft Complete!'}
        </h3>
        <p className="text-gray-600 mb-4">
          {league.marketplace_completed 
            ? 'The marketplace phase is complete! All players have used their coins to build their teams. You can now set your weekly lineups for the season.'
            : 'All players have completed their turns. The draft is now finished, but the marketplace remains open for trading.'
          }
        </p>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">Your Team ({userTeam.length}/{league.max_players_per_team || 10} players)</h4>
          {userTeam.length > 0 ? (
            <div className="space-y-2">
              {userTeam.map(player => (
                <div key={player.id} className="flex justify-between items-center text-sm">
                  <span>{player.name}</span>
                  <span className="text-gray-500">ELO: {player.elo}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No players on your team</p>
          )}
        </div>
        {league.marketplace_completed && (
          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
            <p className="text-sm text-blue-700">
              The marketplace is now closed. You can set your weekly lineups in the League page to start earning points!
            </p>
          </div>
        )}
      </div>
    );
  }


    return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Turn-Based Marketplace</h3>
                        <div className="text-lg font-semibold text-amber-700 bg-amber-100 px-4 py-2 rounded">
          Coins: {userCoinBalance !== null ? userCoinBalance : '...'} 🪙
        </div>
      </div>

      {/* Current Turn Status */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">Current Turn</h4>
        {league.marketplace_completed ? (
          <div className="space-y-2">
            <p className="text-sm text-green-600 font-semibold">✅ Marketplace Complete!</p>
            <p className="text-sm text-gray-600">All players have run out of coins. The marketplace is now closed.</p>
          </div>
        ) : currentTurn ? (
          <div className="space-y-2">
            <p className="text-sm">
              Turn {currentTurn.turn_number + 1} of {currentTurn.total_turns}
            </p>
            <p className="text-sm">
              {isUserTurn ? (
                <span className="text-green-600 font-semibold">It's your turn!</span>
              ) : (
                <span className="text-gray-600">Waiting for another player...</span>
              )}
            </p>
            {isUserTurn && (
              <p className="text-sm">
                Your team: {userTeamSize}/{league.max_players_per_team || 10} players
              </p>
            )}
            {/* Bot turn indicator */}
            {currentTurn && !isUserTurn && (
              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                <p className="text-purple-700 text-sm">
                  🤖 Bot's turn - Processing automatically...
                </p>
                <button
                  onClick={() => {
                    const currentUserId = league.marketplace_order?.[league.current_marketplace_turn || 0];
                    if (currentUserId) {
                      autoMarketplaceForBot(currentUserId, league.id).then(({ success, error }) => {
                        if (success) {
                          // Manual bot action completed
                          setTimeout(() => onUpdate(), 1000);
                        } else {
                          console.error('Manual bot action failed:', error);
                        }
                      });
                    }
                  }}
                  className="mt-2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs"
                >
                  Manual Trigger Bot Action
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Loading turn information...</p>
          </div>
        )}

        {/* Auto-skip info */}
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
          <p className="text-orange-700 font-semibold">💡 Auto-Skip Feature</p>
          <p className="text-orange-600">Users with 0 coins are automatically skipped and removed from the draft</p>
        </div>
      </div>

      {/* User's Turn Actions */}
      {isUserTurn && userCoinBalance !== null && !marketplaceDraftCompleted && (
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            {userCoinBalance === 0 ? (
              <>
                <div className="text-red-600 font-semibold mb-2">
                  ⚠️ You have 0 coins. You cannot buy any more players.
                </div>
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-colors disabled:opacity-50"
                >
                  Skip Turn (Remove from Draft)
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  💡 Other users with 0 coins will be automatically skipped
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-colors disabled:opacity-50"
                >
                  Skip Turn (Remove from Draft)
                </button>
                {!canBuy && (
                  <div className="text-red-600 font-semibold mb-2">
                    You have reached the maximum number of players for your team in this league.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Available Players */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-gray-900">Available Players</h4>
          <div className="text-sm text-gray-600">
            {filteredPlayers.filter(p => userCoinBalance !== null && userCoinBalance >= calculatePlayerPrice(p.elo)).length} affordable
            {' '}• {filteredPlayers.length} total
          </div>
        </div>
        
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Players List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPlayers.map(player => {
            const price = calculatePlayerPrice(player.elo);
            const details = getPlayerDetails(player.name);
            const canAfford = userCoinBalance !== null && userCoinBalance >= price;
            
            return (
              <div key={player.id} className={`border rounded-lg p-6 ${
                canAfford ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                {canAfford && (
                  <div className="mb-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                      ✓ Affordable
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h5 className="font-semibold text-lg">{player.name}</h5>
                      {details?.country && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {details.country}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>ELO: {player.elo} • {getPlayerTier(player.elo)}</p>
                      {details?.fide_id && <p>FIDE ID: {details.fide_id}</p>}
                      {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
                        <p>ACL: {details.average_centipawn_loss.toFixed(1)} ({details.games} games)</p>
                      ) : null}
                      <p>
                        <a 
                          href={`https://www.chess.com/member/${player.name.toLowerCase().replace(/\s+/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View on Chess.com
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-amber-600">{price} 🪙</div>
                    {isUserTurn && canBuy && (
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setShowBuyConfirmation(true);
                        }}
                        disabled={userCoinBalance < price || loading}
                        className={`mt-2 px-4 py-2 rounded-md font-medium transition-colors ${
                          userCoinBalance >= price
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {userCoinBalance >= price ? 'Buy Player' : 'Insufficient Coins'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User's Team */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">Your Team ({userTeam.length}/{league.max_players_per_team || 10})</h4>
        {userTeam.length > 0 ? (
          <div className="space-y-2">
            {userTeam.map(player => (
              <div key={player.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <span className="font-medium">{player.name}</span>
                  <span className="text-gray-500 ml-2">ELO: {player.elo}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No players on your team yet</p>
        )}
      </div>

      {/* Turn History */}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Turn History */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Recent Turns</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {turnHistory.map(turn => (
            <div key={turn.id} className="text-sm p-2 bg-gray-50 rounded">
              <span className="font-medium">Turn {turn.turn_number + 1}:</span>{' '}
              <span>{turn.action_type === 'buy' ? `Bought ${turn.player_id ? 'a player' : 'player'} for ${turn.price} coins` : 'Skipped turn'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Buy Confirmation Modal */}
      {showBuyConfirmation && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Purchase</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Player: {selectedPlayer.name}</p>
              <p className="text-sm text-gray-600 mb-2">ELO: {selectedPlayer.elo}</p>
              <p className="text-sm text-gray-600 mb-2">Price: {calculatePlayerPrice(selectedPlayer.elo)} 🪙</p>
              <p className="text-sm text-gray-600 mb-4">Your balance: {userCoinBalance} 🪙</p>
              
              {/* Chess.com Profile Link */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Chess.com Profile:</strong>
                </p>
                <a 
                  href={`https://www.chess.com/member/${selectedPlayer.name.toLowerCase().replace(/\s+/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  View Profile on Chess.com →
                </a>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowBuyConfirmation(false);
                  setSelectedPlayer(null);
                }}
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => buyPlayer(selectedPlayer.id, calculatePlayerPrice(selectedPlayer.elo))}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Open/Closed Message */}
      {!marketplaceDraftCompleted && !isMarketplaceOpen() && (
        <div className="text-red-600 font-semibold mb-2">
          The marketplace is closed. It opens Wednesday 1 AM PT and closes Monday 11:59 PM PT.
        </div>
      )}

      {/* Hide buy/skip/end UI if user has no coins or draft is completed */}
      {(userCoinBalance === 0 || userCoinBalance === null || marketplaceDraftCompleted) && isUserTurn && (
        <div className="text-gray-500 italic">You have no coins remaining or the draft is completed.</div>
      )}
    </div>
  );
} 