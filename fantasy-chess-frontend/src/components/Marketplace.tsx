import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CoinTransaction, calculatePlayerPrice, getPlayerTier } from '../types/coin-system';
import { useAuth } from '../contexts/AuthContext';
import { ChessPlayer } from '../types';

interface MarketplaceProps {
  leagueId: string;
}

interface League {
  id: string;
  name: string;
  marketplace_started: boolean;
  draft_completed: boolean;
  creator_id: string;
}

export default function Marketplace({ leagueId }: MarketplaceProps) {
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'owned' | 'transactions'>('marketplace');
  const [allPlayers, setAllPlayers] = useState<ChessPlayer[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<ChessPlayer[]>([]);
  const [ownedPlayers, setOwnedPlayers] = useState<ChessPlayer[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [userCoinBalance, setUserCoinBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellingPlayer, setSellingPlayer] = useState<{ player: ChessPlayer; price: number } | null>(null);
  const [buyingPlayer, setBuyingPlayer] = useState<{ player: ChessPlayer; price: number } | null>(null);
  const [sellingToMarketplace, setSellingToMarketplace] = useState<{ player: ChessPlayer; price: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  useEffect(() => {
    if (user && leagueId) {
      loadData();
    }
  }, [user, leagueId]);

  // Get owned player IDs for filtering marketplace
  const getOwnedPlayerIds = async () => {
    try {
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('league_id', leagueId);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return new Set<string>();
      }

      // Create set of owned player IDs in this league
      const ownedPlayerIds = new Set<string>();
      allTeams?.forEach(team => {
        team.player_ids?.forEach((id: string) => ownedPlayerIds.add(id));
      });

      return ownedPlayerIds;
    } catch (err) {
      console.error('Error getting owned player IDs:', err);
      return new Set<string>();
    }
  };

  // Filter marketplace listings based on search term and ownership
  const filterMarketplaceListings = async () => {
    const ownedPlayerIds = await getOwnedPlayerIds();
    
    if (searchTerm.trim() === '') {
      setMarketplaceListings(
        allPlayers.filter((p: ChessPlayer) => !ownedPlayerIds.has(p.id))
          .slice(0, showAllPlayers ? undefined : 30)
      );
    } else {
      const filtered = allPlayers.filter((p: ChessPlayer) => 
        !ownedPlayerIds.has(p.id) && p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setMarketplaceListings(filtered.slice(0, showAllPlayers ? undefined : 30));
    }
  };

  // Update marketplace listings when search term or showAllPlayers changes
  useEffect(() => {
    filterMarketplaceListings();
  }, [searchTerm, allPlayers, showAllPlayers, leagueId]);

  const loadData = async () => {
    try {
      setLoading(true);

      
      // Load league data first
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('id, name, marketplace_started, draft_completed, creator_id')
        .eq('id', leagueId)
        .single();
      
      if (leagueError) {
        console.error('Failed to load league data:', leagueError);
        throw leagueError;
      }
      
      setLeague(leagueData);

      
      // Load all chess players with pagination
      let allPlayersData: ChessPlayer[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data: players, error: playersError } = await supabase
          .from('chess_players')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (playersError) throw playersError;
        if (!players || players.length === 0) break;
        allPlayersData = allPlayersData.concat(players);
        if (players.length < pageSize) break;
        page++;
      }

      setAllPlayers(allPlayersData);
      
      // Get user's team to determine owned players
      const { data: userTeam, error: teamError } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('user_id', user?.id)
        .eq('league_id', leagueId)
        .single();
      
      if (teamError) {
        // Create empty team if it doesn't exist
        const { error: createError } = await supabase
          .from('teams')
          .insert({
            user_id: user?.id,
            league_id: leagueId,
            player_ids: [],
            created_at: new Date().toISOString()
          });
        
        if (createError) {
          console.error('Failed to create team:', createError);
        }
      }
      
      const userPlayerIds = userTeam?.player_ids || [];
      
      // Filter owned players based on teams table
      const filteredOwnedPlayers = allPlayersData.filter(p => 
        userPlayerIds.includes(p.id)
      );
      
      setOwnedPlayers(filteredOwnedPlayers);
      
      await loadTransactions();
      await loadUserCoinBalance();
    } catch (err) {
      setError('Failed to load marketplace data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', user?.id)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    setTransactions(data || []);
  };

  const loadUserCoinBalance = async () => {
    const { data, error } = await supabase
      .from('league_coin_balances')
      .select('coin_balance')
      .eq('user_id', user?.id)
      .eq('league_id', leagueId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        const { error: initError } = await supabase.rpc('initialize_league_coin_balance', {
          p_user_id: user?.id,
          p_bot_id: null,
          p_league_id: leagueId
        });
        if (initError) {
          setUserCoinBalance(0);
          return;
        }
        setUserCoinBalance(50);
        return;
      }
      throw error;
    }
    setUserCoinBalance(data?.coin_balance || 0);
  };

  // Buy a player: add to user's team
  const buyPlayer = async (playerId: string, price: number) => {
    try {
      // Get current user's team
      const { data: userTeam, error: teamError } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('user_id', user?.id)
        .eq('league_id', leagueId)
        .single();

      if (teamError) {
        console.error('Failed to get user team:', teamError);
        throw teamError;
      }

      const currentPlayerIds = userTeam?.player_ids || [];

      // Check if player is already owned
      if (currentPlayerIds.includes(playerId)) {
        setError('Player is already owned');
        return;
      }

      // Add player to team
      const newPlayerIds = [...currentPlayerIds, playerId];
      const { error: updateTeamError } = await supabase
        .from('teams')
        .update({ player_ids: newPlayerIds })
        .eq('user_id', user?.id)
        .eq('league_id', leagueId);

      if (updateTeamError) {
        console.error('Failed to update team:', updateTeamError);
        throw updateTeamError;
      }

      // Deduct coins from user's balance
      const { error: coinError } = await supabase
        .from('league_coin_balances')
        .update({ 
          coin_balance: userCoinBalance - price,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id)
        .eq('league_id', leagueId);

      if (coinError) {
        console.error('Failed to deduct coins:', coinError);
        throw coinError;
      }

      // Add transaction record
      const { error: transactionError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user?.id,
          league_id: leagueId,
          transaction_type: 'player_purchase',
          amount: -price,
          description: `Purchased ${allPlayers.find(p => p.id === playerId)?.name || 'player'}`
        });

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
        // Don't throw error for transaction record failure
      }

      // Reload data to get updated information
      await loadData();
      
      // Refresh marketplace listings to update what shows in marketplace vs owned
      await filterMarketplaceListings();
      
      setError(null);
    } catch (err) {
      console.error('Buy player error:', err);
      setError('Failed to purchase player');
    }
  };

  // Confirm buy player
  const confirmBuyPlayer = async () => {
    if (!buyingPlayer) return;
    try {
      await buyPlayer(buyingPlayer.player.id, buyingPlayer.price);
      setBuyingPlayer(null);
    } catch (err) {
      console.error('Confirm buy player error:', err);
    }
  };

  // Sell a player: remove from user's team
  const sellPlayer = async () => {
    if (!sellingPlayer) return;
    try {
      // Get current user's team
      const { data: userTeam, error: teamError } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('user_id', user?.id)
        .eq('league_id', leagueId)
        .single();

      if (teamError) {
        console.error('Failed to get user team:', teamError);
        throw teamError;
      }

      const currentPlayerIds = userTeam?.player_ids || [];

      // Check if player is owned by user
      if (!currentPlayerIds.includes(sellingPlayer.player.id)) {
        setError('Player is not owned by you');
        return;
      }

      // Remove player from team
      const newPlayerIds = currentPlayerIds.filter((id: string) => id !== sellingPlayer.player.id);
      const { error: updateTeamError } = await supabase
        .from('teams')
        .update({ player_ids: newPlayerIds })
        .eq('user_id', user?.id)
        .eq('league_id', leagueId);

      if (updateTeamError) {
        console.error('Failed to update team:', updateTeamError);
        throw updateTeamError;
      }

      // Update lineup to remove the sold player
      const currentWeek = getCurrentWeekStart();
      const { data: currentLineup, error: lineupError } = await supabase
        .from('lineups')
        .select('player_ids')
        .eq('user_id', user?.id)
        .eq('league_id', leagueId)
        .eq('week_start_date', currentWeek)
        .maybeSingle();

      if (!lineupError && currentLineup && currentLineup.player_ids) {
        // Remove the sold player from the lineup
        const updatedLineupPlayerIds = currentLineup.player_ids.filter((id: string) => id !== sellingPlayer.player.id);
        
        const { error: updateLineupError } = await supabase
          .from('lineups')
          .update({ player_ids: updatedLineupPlayerIds })
          .eq('user_id', user?.id)
          .eq('league_id', leagueId)
          .eq('week_start_date', currentWeek);

        if (updateLineupError) {
          console.error('Failed to update lineup:', updateLineupError);
          // Don't throw error here as the main operation succeeded
        }
      }

      const refund = Math.floor(sellingPlayer.price * 0.8);

      // Add coins to user's balance
      const { error: coinError } = await supabase
        .from('league_coin_balances')
        .update({ 
          coin_balance: userCoinBalance + refund,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id)
        .eq('league_id', leagueId);

      if (coinError) {
        console.error('Failed to add coins:', coinError);
        throw coinError;
      }

      // Add transaction record
      const { error: transactionError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user?.id,
          league_id: leagueId,
          transaction_type: 'sale',
          amount: refund,
          description: `Sold ${sellingPlayer.player.name} for ${refund} coins`,
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError);
        // Don't throw error for transaction record failure
      }

      setSellingPlayer(null);
      await loadData();

      // Refresh marketplace listings to update what shows in marketplace vs owned
      await filterMarketplaceListings();

      setError(null);
    } catch (err) {
      console.error('Sell player error:', err);
      setError('Failed to sell player');
    }
  };

  // Confirm sell to marketplace
  const confirmSellToMarketplace = async () => {
    if (!sellingToMarketplace) return;
    setLoading(true);
    setError(null);
    try {
      // Remove player from user's team (ownership is tracked via teams table)
      const { data: userTeam, error: teamError } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('user_id', user?.id)
        .eq('league_id', leagueId)
        .single();

      if (teamError) {
        console.error('Failed to get user team:', teamError);
        throw teamError;
      }

      const currentPlayerIds = userTeam?.player_ids || [];

      // Check if player is owned by user
      if (!currentPlayerIds.includes(sellingToMarketplace.player.id)) {
        setError('Player is not owned by you');
        return;
      }

      // Remove player from team
      const newPlayerIds = currentPlayerIds.filter((id: string) => id !== sellingToMarketplace.player.id);
      const { error: updateTeamError } = await supabase
        .from('teams')
        .update({ player_ids: newPlayerIds })
        .eq('user_id', user?.id)
        .eq('league_id', leagueId);

      if (updateTeamError) {
        console.error('Failed to update team:', updateTeamError);
        throw updateTeamError;
      }

      // Update lineup to remove the sold player
      const currentWeek = getCurrentWeekStart();
      const { data: currentLineup, error: lineupError } = await supabase
        .from('lineups')
        .select('player_ids')
        .eq('user_id', user?.id)
        .eq('league_id', leagueId)
        .eq('week_start_date', currentWeek)
        .maybeSingle();

      if (!lineupError && currentLineup && currentLineup.player_ids) {
        // Remove the sold player from the lineup
        const updatedLineupPlayerIds = currentLineup.player_ids.filter((id: string) => id !== sellingToMarketplace.player.id);
        
        const { error: updateLineupError } = await supabase
          .from('lineups')
          .update({ player_ids: updatedLineupPlayerIds })
          .eq('user_id', user?.id)
          .eq('league_id', leagueId)
          .eq('week_start_date', currentWeek);

        if (updateLineupError) {
          console.error('Failed to update lineup:', updateLineupError);
          // Don't throw error here as the main operation succeeded
        }
      }

      // Add the full sale price as refund (price is already the 80% value)
      const refund = sellingToMarketplace.price;

      const { error: coinError } = await supabase.rpc('add_league_coins', {
        p_user_id: user?.id,
        p_league_id: leagueId,
        p_amount: refund
      });

      if (coinError) {
        console.error('add_league_coins error:', coinError);
        throw coinError;
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user?.id,
          league_id: leagueId,
          transaction_type: 'player_sale',
          amount: refund,
          description: `Sold ${sellingToMarketplace.player.name} to marketplace`
        });

      if (transactionError) {
        console.error('Failed to record transaction:', transactionError);
        // Don't throw error here as the main operation succeeded
      }

      await loadData();

      // Refresh marketplace listings to update what shows in marketplace vs owned
      await filterMarketplaceListings();

      setSellingToMarketplace(null);
    } catch (err) {
      setError('Failed to sell player to marketplace: ' + JSON.stringify(err));
      console.error('Sell to Marketplace exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'weekly_award': return '🎁';
      case 'player_purchase': return '💰';
      case 'player_sale': return '💸';
      case 'trade_buy': return '🔄';
      case 'trade_sell': return '🔄';
      case 'bonus': return '🎉';
      case 'join_bonus': return '🎉';
      default: return '📊';
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPlayerDetails = (username: string) => {
    return allPlayers.find(p => p.name === username);
  };

  const getCurrentWeekStart = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysToSubtract)
    // Ensure we get a clean date string without timezone issues
    const year = monday.getFullYear()
    const month = String(monday.getMonth() + 1).padStart(2, '0')
    const day = String(monday.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if marketplace is available (draft must be started)
  if (!league?.marketplace_started) {
    return (
      <div className="bg-white shadow-md p-6 w-full">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Marketplace Not Available</h2>
          <p className="text-gray-600 mb-4">
            The marketplace will be available once the draft has started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md p-6 w-full">
      {/* Trading Marketplace Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-2">🛒 Trading Marketplace</h2>
        <p className="text-gray-600">
          Buy and sell players with other league members using coins. Available after draft starts.
        </p>
      </div>

      {/* Coin Balance Display */}
      <div className="mb-6 bg-white border border-royalBlue rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900">Your Coin Balance</h3>
            <p className="text-neutral-700 text-sm">Use coins to buy players from other members</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-royalBlue">{userCoinBalance}</div>
            <div className="text-xs text-royalBlue">coins</div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'marketplace'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Marketplace ({allPlayers.filter(p => {
            // Ownership is tracked via teams table, not league_owners column
            return true; // Show all players in marketplace
          }).length})
        </button>
        <button
          onClick={() => setActiveTab('owned')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'owned'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          My Players ({ownedPlayers.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'transactions'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          History
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'marketplace' && (
        <div className="space-y-4">
          {/* Search and controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Showing {marketplaceListings.length} of {allPlayers.filter(p => {
                  // Ownership is tracked via teams table, not league_owners column
                  return true;
                }).length} players
              </span>
              {!showAllPlayers && allPlayers.filter(p => {
                // Ownership is tracked via teams table, not league_owners column
                return true;
              }).length > 30 && (
                <button
                  onClick={() => setShowAllPlayers(true)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Show All
                </button>
              )}
              {showAllPlayers && (
                <button
                  onClick={() => setShowAllPlayers(false)}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Show Less
                </button>
              )}
            </div>
          </div>

          {marketplaceListings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No players found matching your search' : 'No players available in the marketplace'}
            </div>
          ) : (
            <div className="grid gap-4">
              {marketplaceListings.map((listing) => {
                const details = getPlayerDetails(listing.name);
                const price = calculatePlayerPrice(listing.elo);
                return (
                  <div key={listing.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg">{listing.name}</h3>
                          {details?.country && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {details.country}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>ELO: {listing.elo} • {getPlayerTier(listing.elo)}</p>
                          {details?.fide_id && <p>FIDE ID: {details.fide_id}</p>}
                          {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
                            <p>ACL: {details.average_centipawn_loss.toFixed(1)} ({details.games} games)</p>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            Available in marketplace
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-amber-600">{price} 🪙</div>
                        <button
                          onClick={() => setBuyingPlayer({ player: listing, price: price })}
                          disabled={userCoinBalance < price}
                          className={`mt-2 px-4 py-2 rounded-md font-medium transition-colors ${
                            userCoinBalance >= price
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {userCoinBalance >= price ? 'Buy Player' : 'Insufficient Coins'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'owned' && (
        <div className="space-y-4">
          {ownedPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              You don't own any players in this league yet. Buy some from the marketplace!
            </div>
          ) : (
            <div className="grid gap-4">
              {ownedPlayers.map((player) => {
                const details = getPlayerDetails(player.name);
                const price = calculatePlayerPrice(player.elo);
                return (
                  <div key={player.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg">{player.name}</h3>
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
                          <p className="text-xs text-gray-500">
                            Owned in this league
                          </p>
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                            <p className="text-sm font-medium text-amber-800">
                              💰 Original Price: {price} 🪙
                            </p>
                            <p className="text-sm text-amber-700">
                              💸 Sell Price: {Math.floor(price * 0.8)} 🪙 (80%)
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        {/* Sell to Marketplace (80%) */}
                        <button
                          onClick={async () => {
                            setSellingToMarketplace({ player, price: Math.floor(price * 0.8) });
                          }}
                          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                        >
                          💸 Sell for {Math.floor(price * 0.8)} 🪙
                        </button>
                        {/* List for Sale (custom price) */}
                        <button
                          onClick={() => setSellingPlayer({ player, price: Math.floor(price * 0.8) })}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          📋 List for Sale
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transaction history in this league
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getTransactionIcon(transaction.transaction_type)}</span>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${getTransactionColor(transaction.amount)}`}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount} 🪙
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Buy Player Confirmation Modal */}
      {buyingPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Purchase</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Player: {buyingPlayer.player.name}</p>
              <p className="text-sm text-gray-600 mb-4">ELO: {buyingPlayer.player.elo}</p>
              <p className="text-sm text-gray-600 mb-4">Price: {buyingPlayer.price} 🪙</p>
              {(() => {
                const details = getPlayerDetails(buyingPlayer.player.name);
                return (
                  <>
                    {details?.fide_id && <p className="text-sm text-gray-600">FIDE ID: {details.fide_id}</p>}
                    {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
                      <p>ACL: {details.average_centipawn_loss.toFixed(1)}% ({details.games} games)</p>
                    ) : null}
                    {details?.country && <p className="text-sm text-gray-600">Country: {details.country}</p>}
                    <p className="text-sm text-gray-600 mt-2">
                      Chess.com Profile: <a href={`https://www.chess.com/member/${buyingPlayer.player.name.toLowerCase().replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Profile</a>
                    </p>
                  </>
                );
              })()}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setBuyingPlayer(null)}
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBuyPlayer}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Player Modal */}
      {sellingPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Sell Player</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Player: {sellingPlayer.player.name}</p>
              <p className="text-sm text-gray-600 mb-2">ELO: {sellingPlayer.player.elo}</p>
              {(() => {
                const details = getPlayerDetails(sellingPlayer.player.name);
                return (
                  <>
                    {details?.fide_id && <p className="text-sm text-gray-600">FIDE ID: {details.fide_id}</p>}
                    {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
                      <p>ACL: {details.average_centipawn_loss.toFixed(1)}% ({details.games} games)</p>
                    ) : null}
                    {details?.country && <p className="text-sm text-gray-600">Country: {details.country}</p>}
                    <p className="text-sm text-gray-600 mt-2 mb-4">
                      Chess.com Profile: <a href={`https://www.chess.com/member/${sellingPlayer.player.name.toLowerCase().replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Profile</a>
                    </p>
                  </>
                );
              })()}
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price (coins)
              </label>
              <input
                type="number"
                value={sellingPlayer.price}
                onChange={(e) => setSellingPlayer({ ...sellingPlayer, price: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setSellingPlayer(null)}
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sellPlayer}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                List for Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell to Marketplace Confirmation Modal */}
      {sellingToMarketplace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Sell to Marketplace</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Player: {sellingToMarketplace.player.name}</p>
              <p className="text-sm text-gray-600 mb-2">ELO: {sellingToMarketplace.player.elo}</p>
              <p className="text-sm text-gray-600 mb-4">Price: {sellingToMarketplace.price} 🪙</p>
              {(() => {
                const details = getPlayerDetails(sellingToMarketplace.player.name);
                return (
                  <>
                    {details?.fide_id && <p className="text-sm text-gray-600">FIDE ID: {details.fide_id}</p>}
                    {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
                      <p>ACL: {details.average_centipawn_loss.toFixed(1)}% ({details.games} games)</p>
                    ) : null}
                    {details?.country && <p className="text-sm text-gray-600">Country: {details.country}</p>}
                    <p className="text-sm text-gray-600 mt-2 mb-4">
                      Chess.com Profile: <a href={`https://www.chess.com/member/${sellingToMarketplace.player.name.toLowerCase().replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Profile</a>
                    </p>
                  </>
                );
              })()}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setSellingToMarketplace(null)}
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmSellToMarketplace}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}