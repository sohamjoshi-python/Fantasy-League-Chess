import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CoinTransaction, calculatePlayerPrice, getPlayerTier } from '../types/coin-system';
import { useAuth } from '../contexts/AuthContext';
import { ChessPlayer } from '../types';

interface MarketplaceProps {
  leagueId: string;
}

export default function Marketplace({ leagueId }: MarketplaceProps) {
  const { user } = useAuth();
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

  useEffect(() => {
    // Filter marketplace listings based on search term
    if (searchTerm.trim() === '') {
      setMarketplaceListings(
        allPlayers.filter((p: ChessPlayer) => {
          let owners = p.league_owners;
          if (typeof owners === 'string') {
            try { owners = JSON.parse(owners); } catch { owners = {}; }
          }
          return !owners || !owners[leagueId];
        }).slice(0, showAllPlayers ? undefined : 30)
      );
    } else {
      const filtered = allPlayers.filter((p: ChessPlayer) => {
        let owners = p.league_owners;
        if (typeof owners === 'string') {
          try { owners = JSON.parse(owners); } catch { owners = {}; }
        }
        return (!owners || !owners[leagueId]) && p.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setMarketplaceListings(filtered.slice(0, showAllPlayers ? undefined : 30));
    }
  }, [searchTerm, allPlayers, showAllPlayers, leagueId]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('=== LOAD DATA DEBUG START ===');
      console.log('Loading data for user:', user?.id, 'league:', leagueId);
      
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
      console.log('Total players loaded with pagination:', allPlayersData.length);
      setAllPlayers(allPlayersData);
      
      // Debug: Analyze ownership data
      let playersWithOwnership = 0;
      let playersOwnedByUser = 0;
      let playersOwnedByOthers = 0;
      let playersWithNullOwnership = 0;
      
      allPlayersData.forEach(p => {
        let owners = p.league_owners;
        if (typeof owners === 'string') {
          try { owners = JSON.parse(owners); } catch { owners = {}; }
        }
        
        if (owners && owners[leagueId]) {
          playersWithOwnership++;
          if (owners[leagueId] === user?.id) {
            playersOwnedByUser++;
            console.log('Player owned by user:', {
              playerId: p.id,
              playerName: p.name,
              owners: owners,
              leagueOwner: owners[leagueId]
            });
          } else {
            playersOwnedByOthers++;
          }
        } else {
          playersWithNullOwnership++;
        }
      });
      
      console.log('Ownership analysis:', {
        totalPlayers: allPlayersData.length,
        playersWithOwnership,
        playersOwnedByUser,
        playersOwnedByOthers,
        playersWithNullOwnership
      });
      
      // Debug logs for user, league, and sample player
      console.log('Current user:', user?.id);
      console.log('Current league:', leagueId);
      if (allPlayersData.length > 0) {
        console.log('Sample player:', allPlayersData[0]);
      }
      
      const filteredOwnedPlayers = (allPlayersData || []).filter(p => {
        let owners = p.league_owners;
        if (typeof owners === 'string') {
          try { owners = JSON.parse(owners); } catch { owners = {}; }
        }
        if (owners && owners[leagueId] && user?.id) {
          console.log('OwnedPlayers filter:', {
            playerId: p.id,
            playerName: p.name,
            owners: owners,
            ownersLeague: owners[leagueId],
            userId: user?.id,
            match: owners[leagueId] === user?.id
          });
        }
        return owners && owners[leagueId] === user?.id;
      });
      
      console.log('Filtered owned players count:', filteredOwnedPlayers.length);
      setOwnedPlayers(filteredOwnedPlayers);
      
      await loadTransactions();
      await loadUserCoinBalance();
      console.log('=== LOAD DATA DEBUG END ===');
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

  // Buy a player: set league owner for that player
  const buyPlayer = async (playerId: string, price: number) => {
    try {
      console.log('=== BUY PLAYER DEBUG START ===');
      console.log('Buying player:', { playerId, price, userCoinBalance, leagueId, userId: user?.id });
      
      if (userCoinBalance < price) {
        setError('Insufficient coins');
        return;
      }

      // Debug: Check player before buying
      const playerBefore = allPlayers.find(p => p.id === playerId);
      console.log('Player before buy:', playerBefore);
      if (playerBefore) {
        let ownersBefore = playerBefore.league_owners;
        if (typeof ownersBefore === 'string') {
          try { ownersBefore = JSON.parse(ownersBefore); } catch { ownersBefore = {}; }
        }
        console.log('league_owners before buy:', ownersBefore);
      }

      // Debug: Log RPC call parameters
      console.log('Calling set_league_owner_for_player with:', {
        p_player_id: playerId,
        p_league_id: leagueId,
        p_user_id: user?.id
      });

      const { data: updateData, error: updateError } = await supabase.rpc('set_league_owner_for_player', {
        p_player_id: playerId,
        p_league_id: leagueId,
        p_user_id: user?.id
      });

      console.log('set_league_owner_for_player response:', { data: updateData, error: updateError });
      
      if (updateError) {
        console.error('set_league_owner_for_player error:', updateError);
        throw updateError;
      }

      console.log('set_league_owner_for_player succeeded');

      const { error: coinError } = await supabase.rpc('deduct_league_coins', {
        p_user_id: user?.id,
        p_league_id: leagueId,
        p_amount: price
      });
      
      if (coinError) {
        console.error('deduct_league_coins error:', coinError);
        throw coinError;
      }

      console.log('deduct_league_coins succeeded');

      // Reload data to get updated player information
      await loadData();

      // Debug: Check player after buying and reloading
      const playerAfter = allPlayers.find(p => p.id === playerId);
      console.log('Player after buy and reload:', playerAfter);
      
      if (playerAfter) {
        let ownersAfter = playerAfter.league_owners;
        if (typeof ownersAfter === 'string') {
          try { ownersAfter = JSON.parse(ownersAfter); } catch { ownersAfter = {}; }
        }
        console.log('league_owners after buy:', ownersAfter);
        console.log('Comparing owners[leagueId]:', ownersAfter && ownersAfter[leagueId], 'with user?.id:', user?.id);
        console.log('Ownership match:', ownersAfter && ownersAfter[leagueId] === user?.id);
      }

      // Debug: Check owned players count
      console.log('Owned players count after buy:', ownedPlayers.length);
      
      console.log('=== BUY PLAYER DEBUG END ===');
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

  // Sell a player: remove league owner for that player
  const sellPlayer = async () => {
    if (!sellingPlayer) return;
    try {
      console.log('=== SELL PLAYER DEBUG START ===');
      console.log('Selling player:', {
        playerId: sellingPlayer.player.id,
        playerName: sellingPlayer.player.name,
        price: sellingPlayer.price,
        leagueId,
        userId: user?.id
      });

      // Debug: Check player before selling
      const playerBefore = allPlayers.find(p => p.id === sellingPlayer.player.id);
      console.log('Player before sell:', playerBefore);
      if (playerBefore) {
        let ownersBefore = playerBefore.league_owners;
        if (typeof ownersBefore === 'string') {
          try { ownersBefore = JSON.parse(ownersBefore); } catch { ownersBefore = {}; }
        }
        console.log('league_owners before sell:', ownersBefore);
      }

      // Debug: Log RPC call parameters
      console.log('Calling remove_league_owner_for_player with:', {
        p_player_id: sellingPlayer.player.id,
        p_league_id: leagueId
      });

      const { data: updateData, error: updateError } = await supabase.rpc('remove_league_owner_for_player', {
        p_player_id: sellingPlayer.player.id,
        p_league_id: leagueId
      });

      console.log('remove_league_owner_for_player response:', { data: updateData, error: updateError });
      
      if (updateError) {
        console.error('remove_league_owner_for_player error:', updateError);
        throw updateError;
      }

      console.log('remove_league_owner_for_player succeeded');

      const refund = Math.floor(sellingPlayer.price * 0.8);
      console.log('Calculated refund:', refund);

      const { error: coinError } = await supabase.rpc('add_league_coins', {
        p_user_id: user?.id,
        p_league_id: leagueId,
        p_amount: refund
      });
      
      if (coinError) {
        console.error('add_league_coins error:', coinError);
        throw coinError;
      }

      console.log('add_league_coins succeeded');

      setSellingPlayer(null);
      await loadData();

      // Debug: Check player after selling and reloading
      const playerAfter = allPlayers.find(p => p.id === sellingPlayer.player.id);
      console.log('Player after sell and reload:', playerAfter);
      
      if (playerAfter) {
        let ownersAfter = playerAfter.league_owners;
        if (typeof ownersAfter === 'string') {
          try { ownersAfter = JSON.parse(ownersAfter); } catch { ownersAfter = {}; }
        }
        console.log('league_owners after sell:', ownersAfter);
        console.log('Ownership removed:', !ownersAfter || !ownersAfter[leagueId]);
      }

      console.log('=== SELL PLAYER DEBUG END ===');
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
      console.log('=== SELL TO MARKETPLACE DEBUG START ===');
      console.log('Sell to Marketplace debug:', {
        player_username: sellingToMarketplace.player.name,
        player_elo: sellingToMarketplace.player.elo,
        purchase_price: sellingToMarketplace.price,
        user_id: user?.id,
        league_id: leagueId,
        player_id: sellingToMarketplace.player.id,
        full_price: sellingToMarketplace.price
      });

      // Debug: Check player before selling
      const playerBefore = allPlayers.find(p => p.id === sellingToMarketplace.player.id);
      console.log('Player before sell to marketplace:', {
        id: playerBefore?.id,
        name: playerBefore?.name,
        league_owners: playerBefore?.league_owners
      });
      if (playerBefore) {
        let ownersBefore = playerBefore.league_owners;
        if (typeof ownersBefore === 'string') {
          try { ownersBefore = JSON.parse(ownersBefore); } catch { ownersBefore = {}; }
        }
        console.log('league_owners before sell to marketplace:', JSON.stringify(ownersBefore));
        console.log('Current league ownership:', ownersBefore && ownersBefore[leagueId]);
      }

      // Debug: Log RPC call parameters
      console.log('Calling remove_league_owner_for_player with:', {
        p_player_id: sellingToMarketplace.player.id,
        p_league_id: leagueId
      });

      const { data: updateData, error: updateError } = await supabase.rpc('remove_league_owner_for_player', {
        p_player_id: sellingToMarketplace.player.id,
        p_league_id: leagueId
      });

      console.log('remove_league_owner_for_player response:', { 
        data: updateData, 
        error: updateError,
        dataType: typeof updateData,
        errorType: typeof updateError
      });
      
      if (updateError) {
        console.error('remove_league_owner_for_player error:', updateError);
        throw updateError;
      }

      console.log('remove_league_owner_for_player succeeded');

      // Calculate and add coin refund
      const refund = Math.floor(sellingToMarketplace.price * 0.8);
      console.log('Calculated refund:', refund);

      const { error: coinError } = await supabase.rpc('add_league_coins', {
        p_user_id: user?.id,
        p_league_id: leagueId,
        p_amount: refund
      });

      if (coinError) {
        console.error('add_league_coins error:', coinError);
        throw coinError;
      }

      console.log('add_league_coins succeeded');

      await loadData();

      // Debug: Check player after selling and reloading
      const playerAfter = allPlayers.find(p => p.id === sellingToMarketplace.player.id);
      console.log('Player after sell to marketplace and reload:', {
        id: playerAfter?.id,
        name: playerAfter?.name,
        league_owners: playerAfter?.league_owners
      });
      
      if (playerAfter) {
        let ownersAfter = playerAfter.league_owners;
        if (typeof ownersAfter === 'string') {
          try { ownersAfter = JSON.parse(ownersAfter); } catch { ownersAfter = {}; }
        }
        console.log('league_owners after sell to marketplace:', JSON.stringify(ownersAfter));
        console.log('Current league ownership after sell:', ownersAfter && ownersAfter[leagueId]);
        console.log('Ownership removed:', !ownersAfter || !ownersAfter[leagueId]);
      }

      console.log('=== SELL TO MARKETPLACE DEBUG END ===');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md p-6 w-full">
      {/* Header with coin balance */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">League Marketplace</h2>
        <div className="flex items-center space-x-2">
          <span className="text-yellow-500 text-xl">🪙</span>
          <span className="text-lg font-semibold text-gray-700">{userCoinBalance} coins</span>
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
            let owners = p.league_owners;
            if (typeof owners === 'string') {
              try { owners = JSON.parse(owners); } catch { owners = {}; }
            }
            return !owners || !owners[leagueId];
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
                  let owners = p.league_owners;
                  if (typeof owners === 'string') {
                    try { owners = JSON.parse(owners); } catch { owners = {}; }
                  }
                  return !owners || !owners[leagueId];
                }).length} players
              </span>
              {!showAllPlayers && allPlayers.filter(p => {
                let owners = p.league_owners;
                if (typeof owners === 'string') {
                  try { owners = JSON.parse(owners); } catch { owners = {}; }
                }
                return !owners || !owners[leagueId];
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
                          {(details?.acpl !== undefined && details?.acpl !== null) ? (
                            <p>Avg Centipawn Loss (ACPL): {details.acpl.toFixed(1)} ({details.games} games)</p>
                          ) : (details?.accuracy !== undefined && details?.accuracy !== null) ? (
                            <p>Accuracy: {details.accuracy.toFixed(1)}% ({details.games} games)</p>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            Listed by: {listing.league_owners && listing.league_owners[leagueId] ? 'User' : 'Bot'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-yellow-600">{price} 🪙</div>
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
                          {(details?.acpl !== undefined && details?.acpl !== null) ? (
                            <p>Avg Centipawn Loss (ACPL): {details.acpl.toFixed(1)} ({details.games} games)</p>
                          ) : (details?.accuracy !== undefined && details?.accuracy !== null) ? (
                            <p>Accuracy: {details.accuracy.toFixed(1)}% ({details.games} games)</p>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            Owned in this league
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        {/* Sell to Marketplace (80%) */}
                        <button
                          onClick={async () => {
                            setSellingToMarketplace({ player, price: Math.floor(price * 0.8) });
                          }}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                        >
                          Sell to Marketplace (80%)
                        </button>
                        {/* List for Sale (custom price) */}
                        <button
                          onClick={() => setSellingPlayer({ player, price: Math.floor(price * 0.8) })}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          List for Sale
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
                    {(details?.acpl !== undefined && details?.acpl !== null) ? (
                      <p>Avg Centipawn Loss (ACPL): {details.acpl.toFixed(1)} ({details.games} games)</p>
                    ) : (details?.accuracy !== undefined && details?.accuracy !== null) ? (
                      <p>Accuracy: {details.accuracy.toFixed(1)}% ({details.games} games)</p>
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
                    {(details?.acpl !== undefined && details?.acpl !== null) ? (
                      <p>Avg Centipawn Loss (ACPL): {details.acpl.toFixed(1)} ({details.games} games)</p>
                    ) : (details?.accuracy !== undefined && details?.accuracy !== null) ? (
                      <p>Accuracy: {details.accuracy.toFixed(1)}% ({details.games} games)</p>
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
                    {(details?.acpl !== undefined && details?.acpl !== null) ? (
                      <p>Avg Centipawn Loss (ACPL): {details.acpl.toFixed(1)} ({details.games} games)</p>
                    ) : (details?.accuracy !== undefined && details?.accuracy !== null) ? (
                      <p>Accuracy: {details.accuracy.toFixed(1)}% ({details.games} games)</p>
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
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                Confirm Sell
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}