import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChessPlayer, League, CurrentMarketplaceTurn, MarketplaceTurn } from '../types';
import { calculatePlayerPrice, getPlayerTier } from '../types/coin-system';

interface TurnBasedMarketplaceProps {
  league: League;
  onUpdate: () => void;
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
  const [autoSkippedTurn, setAutoSkippedTurn] = useState<number | null>(null);

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
        league.draft_completed || 
        (league.marketplace_order && league.marketplace_order.length === 0)
      );
    }
  }, [league?.id, league?.current_marketplace_turn, league?.draft_completed, league?.marketplace_order]);

  // Remove the auto-skip useEffect entirely

  const loadCurrentTurn = async () => {
    try {
      console.log('Loading current turn for league:', league.id);
      const { data, error } = await supabase.rpc('get_current_marketplace_turn', {
        p_league_id: league.id
      });
      
      console.log('get_current_marketplace_turn response:', { data, error });
      
      if (error) throw error;
      if (data && data.length > 0) {
        setCurrentTurn(data[0]);
        console.log('Set current turn:', data[0]);
      } else {
        console.log('No current turn data found');
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
      console.log('Loading all chess players...');
      
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
          console.log(`Fetched page ${page + 1}: ${players.length} players (total so far: ${allPlayers.length})`);
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

      console.log(`✅ Total players fetched: ${allPlayers.length}`);

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
      console.log(`✅ Available players after filtering: ${available.length}`);
      
      setAvailablePlayers(available);
    } catch (err) {
      console.error('Error loading available players:', err);
    }
  };

  const loadUserTeam = async () => {
    if (!user?.id) return;
    try {
      const { data: team, error: teamError, status } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .single();

      if (teamError && teamError.code === 'PGRST116') {
        // No team row exists, so insert one
        const { data: newTeam, error: insertError } = await supabase
          .from('teams')
          .insert([
            {
              user_id: user.id,
              league_id: league.id,
              player_ids: [],
              created_at: new Date().toISOString()
            }
          ])
          .select('player_ids')
          .single();
        if (insertError) throw insertError;
        setUserTeam([]);
        console.log('Inserted new team for league', league.id, newTeam);
        return;
      }

      if (teamError) throw teamError;

      if (team?.player_ids) {
        // Fetch player details for the current league only
        const { data: players, error: playersError } = await supabase
          .from('chess_players')
          .select('*')
          .in('id', team.player_ids);
        if (playersError) throw playersError;
        setUserTeam(players || []);
        console.log('Loaded userTeam for league', league.id, players); // Debug log
      } else {
        setUserTeam([]);
        console.log('Loaded userTeam for league', league.id, []); // Debug log
      }
    } catch (err) {
      setUserTeam([]);
    }
  };

  const loadUserCoinBalance = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('league_coin_balances')
        .select('coin_balance')
        .eq('user_id', user.id)
        .eq('league_id', league.id)
        .single();

      if (error) {
        console.log('Coin balance error:', error);
        if (error.code === 'PGRST116') {
          // Initialize balance if not exists
          console.log('Initializing coin balance for user:', user.id, 'league:', league.id);
          const { data: initData, error: initError } = await supabase.rpc('initialize_league_coin_balance', {
            p_user_id: user.id,
            p_bot_id: null,
            p_league_id: league.id
          });
          console.log('initialize_league_coin_balance response:', { initData, initError });
          if (initError) {
            console.error('Failed to initialize coin balance:', initError);
            setUserCoinBalance(0);
            return;
          }
          
          // If RPC returned false, manually insert the record
          if (initData === false) {
            console.log('RPC returned false, manually inserting coin balance record');
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
              console.error('Failed to manually insert coin balance:', insertError);
              setUserCoinBalance(0);
              return;
            }
            console.log('Manually inserted coin balance record');
          }
          
          console.log('Coin balance initialized successfully, setting to 50');
          setUserCoinBalance(50);
          return;
        }
        // For 406 errors, try to manually insert the coin balance
        if (error.code === '406') {
          console.log('406 error - trying to manually insert coin balance');
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
            console.error('Failed to manually insert coin balance:', insertError);
            setUserCoinBalance(0);
            return;
          }
          setUserCoinBalance(50);
          return;
        }
        throw error;
      }
      setUserCoinBalance(data?.coin_balance || 0);
    } catch (err) {
      console.error('Error loading coin balance:', err);
      setUserCoinBalance(0);
    }
  };

  const loadTurnHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_turns')
        .select('*')
        .eq('league_id', league.id)
        .order('turn_number', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTurnHistory(data || []);
    } catch (err) {
      console.error('Error loading turn history:', err);
    }
  };

  const startMarketplace = async () => {
    if (!isOwner) return;
    
    try {
      setLoading(true);
      console.log('Starting marketplace for league:', league.id);
      
      const { data, error } = await supabase.rpc('start_marketplace', {
        p_league_id: league.id
      });
      
      console.log('start_marketplace response:', { data, error });
      
      if (error) {
        console.error('start_marketplace error details:', error);
        throw error;
      }
      
      console.log('Marketplace started successfully');
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
      console.log('⚠️ Action too soon, please wait...');
      return;
    }
    setLastActionTime(now);

    try {
      setLoading(true);
      setError(null);

      console.log(`🔄 Buying player ${playerId} for ${price} coins...`);
      console.log('Debug info:', { isUserTurn, canBuy, userId: user?.id, loading });

      // Fetch the current team row
      console.log('📋 Fetching team data...');
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

      console.log('✅ Team data:', team);

      // Add the new player to the array
      const newPlayerIds = [...(team.player_ids || []), playerId];
      console.log('📝 New player IDs array:', newPlayerIds);

      // Update the team row
      console.log('🔄 Updating team...');
      const { error: updateError } = await supabase
        .from('teams')
        .update({ player_ids: newPlayerIds })
        .eq('id', team.id);

      if (updateError) {
        console.error('❌ Team update error:', updateError);
        throw updateError;
      }

      console.log(`✅ Team updated, recording marketplace action...`);

      // Call the marketplace action (backend will deduct coins and advance turn)
      console.log('🔄 Calling record_marketplace_action...');
      const { error: actionError } = await supabase.rpc('record_marketplace_action', {
        p_league_id: league.id,
        p_user_id: user.id,
        p_action_type: 'buy',
        p_player_id: playerId,
        p_price: price,
        p_bot_id: null
      });
      
      if (actionError) {
        console.error('❌ Marketplace action error:', actionError);
        throw actionError;
      }

      console.log(`✅ Marketplace action recorded successfully`);

      // Reload team, available players, and coin balance
      console.log('🔄 Reloading data...');
      await loadUserTeam();
      await loadAvailablePlayers();
      await loadUserCoinBalance();
      onUpdate();
      
      console.log('✅ Buy player completed successfully');
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
      console.log('⚠️ Action too soon, please wait...');
      return;
    }
    setLastActionTime(now);

    setLoading(true);
    try {
      console.log(`🔄 Skipping turn and removing from draft...`);
      
      // IMPORTANT: Do NOT call advance_marketplace_turn here!
      // The backend record_marketplace_action function already advances the turn.
      const { error: actionError } = await supabase.rpc('record_marketplace_action', {
        p_league_id: league.id,
        p_user_id: user.id,
        p_action_type: 'skip',
        p_player_id: null,
        p_price: null,
        p_bot_id: null
      });
      if (actionError) throw actionError;
      
      console.log(`✅ Turn skipped and user removed from draft successfully`);
      onUpdate();
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
        
        {/* Debug information */}
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <p><strong>Debug Info:</strong></p>
          <p>User ID: {user?.id}</p>
          <p>League Creator ID: {league?.creator_id}</p>
          <p>Is Owner: {isOwner ? 'Yes' : 'No'}</p>
          <p>Marketplace Started: {league?.marketplace_started ? 'Yes' : 'No'}</p>
          <p><strong>Your Coin Balance:</strong> {userCoinBalance !== null ? userCoinBalance : 'Loading...'}</p>
          <p>Current Turn: {league?.current_marketplace_turn || 0}</p>
          <p>Marketplace Order Length: {league?.marketplace_order?.length || 0}</p>
          <p>Marketplace Order: {league?.marketplace_order?.join(', ') || 'None'}</p>
        </div>
        
        {isOwner && (
          <button
            onClick={startMarketplace}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Marketplace'}
          </button>
        )}
        {!isOwner && (
          <p className="text-gray-500 italic">Waiting for the league owner to start the marketplace...</p>
        )}
      </div>
    );
  }

  if (league.draft_completed || (league.marketplace_order && league.marketplace_order.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Draft Complete!</h3>
        <p className="text-gray-600 mb-4">
          All players have completed their turns. The draft is now finished, but the marketplace remains open for trading.
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
      </div>
    );
  }


  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Turn-Based Marketplace</h3>
        <div className="text-lg font-semibold text-yellow-700 bg-yellow-100 px-4 py-2 rounded">
          Coins: {userCoinBalance !== null ? userCoinBalance : '...'} 🪙
        </div>
      </div>
      
      {/* Current Turn Status */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">Current Turn</h4>
        {currentTurn ? (
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
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600">No current turn data found</p>
            <p className="text-sm text-gray-600">Debug: currentTurn is null</p>
          </div>
        )}
        
        {/* Debug info */}
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <p><strong>Debug:</strong></p>
          <p>currentTurn: {currentTurn ? 'exists' : 'null'}</p>
          <p>isUserTurn: {isUserTurn ? 'true' : 'false'}</p>
          <p>user.id: {user?.id}</p>
          <p>currentTurn?.current_user_id: {currentTurn?.current_user_id}</p>
          <p>turn_number: {currentTurn?.turn_number}</p>
          <p>total_turns: {currentTurn?.total_turns}</p>
          <p>league.current_marketplace_turn: {league?.current_marketplace_turn}</p>
          <p>marketplace_order length: {league?.marketplace_order?.length || 0}</p>
          <p>marketplace_order: {(league?.marketplace_order?.length || 0) > 0 ? league?.marketplace_order?.slice(0, 10).join(', ') : 'None (All players removed)'}</p>
          <p>Expected current user: {(league?.marketplace_order?.length || 0) > 0 ? (league?.marketplace_order?.[(league?.current_marketplace_turn || 0) + 1] || 'None') : 'None (No players in draft)'}</p>
          <p>Draft completed: {league?.draft_completed ? 'Yes' : 'No'}</p>
          <p>All players expended coins: {(league?.marketplace_order?.length || 0) === 0 ? 'Yes' : 'No'}</p>
          
          {/* Debug button for testing */}
          {isOwner && (
            <button
              onClick={async () => {
                try {
                  console.log('Manually advancing turn...');
                  const { error } = await supabase.rpc('advance_marketplace_turn', {
                    p_league_id: league.id
                  });
                  if (error) {
                    console.error('Error advancing turn:', error);
                  } else {
                    console.log('Turn advanced successfully');
                    // Re-fetch league state after advancing turn
                    if (typeof onUpdate === 'function') {
                      await onUpdate();
                    }
                    loadCurrentTurn();
                  }
                } catch (err) {
                  console.error('Failed to advance turn:', err);
                }
              }}
              className="mt-2 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
            >
              Debug: Advance Turn
            </button>
          )}
        </div>
      </div>

      {/* User's Turn Actions */}
      {isUserTurn && userCoinBalance !== null && !marketplaceDraftCompleted && (
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            {userCoinBalance === 0 ? (
              <>
                <div className="text-red-600 font-semibold mb-2">
                  You have 0 coins. You cannot buy any more players.
                </div>
                <button
                  onClick={handleSkip}
                  disabled={loading}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-colors disabled:opacity-50"
                >
                  Skip Turn (Remove from Draft)
                </button>
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
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
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
              <div key={player.id} className={`border rounded-lg p-4 ${
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
                      {(details?.accuracy !== undefined && details?.accuracy !== null) ? (
                        <p>Accuracy: {details.accuracy.toFixed(1)}% ({details.games} games)</p>
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
                    <div className="text-2xl font-bold text-yellow-600">{price} 🪙</div>
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
              <div key={player.id} className="flex justify-between items-center p-3 border rounded-lg">
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