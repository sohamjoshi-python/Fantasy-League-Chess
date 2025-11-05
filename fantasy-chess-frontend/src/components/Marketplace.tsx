import { useState, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import { supabase } from '../lib/supabase';
import { CoinTransaction, calculatePlayerPrice, getPlayerTier } from '../types/coin-system';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { StaggeredTransition } from './ui/SmoothTransition';
import { ChessPlayer } from '../types';
import TradeModal from './TradeModal';
import TradeNotificationPopup from './TradeNotificationPopup';
import TradingTab from './TradingTab';
import { getTradeNotifications, markNotificationSeen } from '../lib/supabase';
import { TradeNotificationWithDetails } from '../types';
import PlayerDetailModal from './PlayerDetailModal';

interface MarketplaceProps {
  leagueId: string;
}

// Memoized PlayerCard component for better performance
const PlayerCard = React.memo(({ 
  player, 
  price, 
  userCoinBalance, 
  onBuyClick, 
  onPlayerClick 
}: {
  player: ChessPlayer;
  price: number;
  userCoinBalance: number;
  onBuyClick: () => void;
  onPlayerClick: () => void;
}) => {
  const details = useMemo(() => getPlayerDetails(player), [player]);
  const tier = useMemo(() => getPlayerTier(player.elo), [player.elo]);
  
  return (
    <div className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 
              className="font-semibold text-base sm:text-lg cursor-pointer hover:text-royalBlue transition-colors truncate"
              onClick={onPlayerClick}
              title={player.name}
            >
              {player.name}
            </h3>
            {details.country && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                {details.country}
              </span>
            )}
          </div>
          <div className="space-y-1 text-xs sm:text-sm text-gray-600">
            <p>ELO: {player.elo} • {tier}</p>
            {details?.fide_id && <p>FIDE ID: {details.fide_id}</p>}
            {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
              <p>ACL: {details.average_centipawn_loss!.toFixed(1)} ({details.games} games)</p>
            ) : null}
            <p className="text-xs text-gray-500">
              Available in marketplace
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-2 sm:ml-4 flex-shrink-0">
          <div className="text-lg sm:text-2xl font-bold text-amber-600 whitespace-nowrap">{price} 🪙</div>
          <button
            onClick={onBuyClick}
            disabled={userCoinBalance < price}
            className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
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
});

PlayerCard.displayName = 'PlayerCard';

// Helper function to get player details
const getPlayerDetails = (player: ChessPlayer) => {
  return {
    country: player.country || null,
    fide_id: player.fide_id || null,
    average_centipawn_loss: player.average_centipawn_loss || player.accuracy || null,
    games: player.games || 0
  };
};

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
  const [activeTab, setActiveTab] = useState<'marketplace' | 'owned' | 'transactions' | 'trading'>('marketplace');
  const [allPlayers, setAllPlayers] = useState<ChessPlayer[]>([]);
  const [ownedPlayers, setOwnedPlayers] = useState<ChessPlayer[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [userCoinBalance, setUserCoinBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sellingPlayer, setSellingPlayer] = useState<{ player: ChessPlayer; price: number } | null>(null);
  const [buyingPlayer, setBuyingPlayer] = useState<{ player: ChessPlayer; price: number } | null>(null);
  const [sellingToMarketplace, setSellingToMarketplace] = useState<{ player: ChessPlayer; price: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Trading state
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradePlayer, setTradePlayer] = useState<ChessPlayer | null>(null);
  const [tradeNotifications, setTradeNotifications] = useState<TradeNotificationWithDetails[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<TradeNotificationWithDetails | null>(null);
  const [playerTradeStatus, setPlayerTradeStatus] = useState<Record<string, boolean>>({});
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<ChessPlayer | null>(null);

  useEffect(() => {
    if (user && leagueId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.id, leagueId]);

  // Memoized owned player IDs to avoid repeated database calls
  const [ownedPlayerIds, setOwnedPlayerIds] = useState<Set<string>>(new Set());

  // Get owned player IDs for filtering marketplace - memoized
  const getOwnedPlayerIds = useCallback(async () => {
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
      const ownedPlayerIdsSet = new Set<string>();
      allTeams?.forEach(team => {
        team.player_ids?.forEach((id: string) => ownedPlayerIdsSet.add(id));
      });

      setOwnedPlayerIds(ownedPlayerIdsSet);
      return ownedPlayerIdsSet;
    } catch (err) {
      console.error('Error getting owned player IDs:', err);
      return new Set<string>();
    }
  }, [leagueId]);

  // Memoized marketplace listings to avoid expensive re-filtering
  const marketplaceListings = useMemo(() => {
    if (!allPlayers.length || !ownedPlayerIds.size) return [];
    
    const filtered = allPlayers.filter((p: ChessPlayer) => {
      const isNotOwned = !ownedPlayerIds.has(p.id);
      const matchesSearch = debouncedSearchTerm.trim() === '' || 
        p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      return isNotOwned && matchesSearch;
    });
    
    if (showAllPlayers) return filtered;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [allPlayers, ownedPlayerIds, debouncedSearchTerm, showAllPlayers, currentPage, itemsPerPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Load owned player IDs when league changes
  useEffect(() => {
    if (leagueId) {
      getOwnedPlayerIds();
    }
  }, [leagueId, getOwnedPlayerIds]);

  const loadPlayerTradeStatus = async () => {
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('player_id')
        .eq('league_id', leagueId)
        .eq('seller_id', user?.id)
        .eq('status', 'pending');
      
      if (error) {
        console.error('Failed to load trade status:', error);
        return;
      }
      
      // Create a map of player IDs that are currently listed for trade
      const tradeStatusMap: Record<string, boolean> = {};
      trades?.forEach(trade => {
        tradeStatusMap[trade.player_id] = true;
      });
      
      setPlayerTradeStatus(tradeStatusMap);
    } catch (err) {
      console.error('Error loading trade status:', err);
    }
  };

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

      
      // Load chess players with pagination - optimized for initial load
      let allPlayersData: ChessPlayer[] = [];
      let page = 0;
      const pageSize = 500; // Reduced page size for better performance
      const maxPages = 10; // Limit to prevent excessive loading
      
      while (page < maxPages) {
        const { data: players, error: playersError } = await supabase
          .from('chess_players')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('elo', { ascending: false }); // Order by ELO for better UX
        
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
      await loadPlayerTradeStatus();
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

  // Trading functions
  const loadTradeNotifications = async () => {
    if (!user?.id || !leagueId) return;
    
    try {
      const result = await getTradeNotifications(user.id, leagueId);
      if (result.success && result.notifications) {
        setTradeNotifications(result.notifications);
        
        // Show popup for unseen notifications
        const unseenNotifications = result.notifications.filter((n: any) => !n.seen);
        if (unseenNotifications.length > 0 && !showNotificationPopup) {
          setCurrentNotification(unseenNotifications[0]);
          setShowNotificationPopup(true);
        }
      }
    } catch (error) {
      console.error('Error loading trade notifications:', error);
    }
  };

  const handleCreateTrade = (player: ChessPlayer) => {
    setTradePlayer(player);
    setShowTradeModal(true);
  };

  const handleTradeSuccess = () => {
    setShowTradeModal(false);
    setTradePlayer(null);
    // Refresh all data comprehensively
    loadData(); // Refresh the data
    loadTradeNotifications(); // Refresh notifications
    loadPlayerTradeStatus(); // Refresh trade status
    // Force a small delay to ensure database updates are complete
    setTimeout(() => {
      loadData();
      loadPlayerTradeStatus();
    }, 500);
  };

  const handleNotificationAccept = async (_notification: TradeNotificationWithDetails) => {
    try {
      // This would be handled by the TradingTab component
      await loadTradeNotifications();
      await loadData();
    } catch (error) {
      console.error('Error accepting trade:', error);
    }
  };

  const handleNotificationClose = () => {
    setShowNotificationPopup(false);
    setCurrentNotification(null);
  };

  const handleMarkNotificationSeen = async (notificationId: string) => {
    try {
      await markNotificationSeen(notificationId);
      await loadTradeNotifications();
    } catch (error) {
      console.error('Error marking notification as seen:', error);
    }
  };

  // Load trade notifications on component mount
  useEffect(() => {
    if (user?.id && leagueId) {
      loadTradeNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadTradeNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, leagueId]);

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600';
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

  if (loading && !league) {
    return (
      <LoadingSpinner size="lg" text="Loading marketplace..." className="p-8" />
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
            The marketplace will be available once the turn-based marketplace has started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md p-4 sm:p-6 w-full max-w-full overflow-hidden">
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
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex-shrink-0 py-2 px-2 sm:px-4 rounded-md font-medium transition-colors text-xs sm:text-sm ${
            activeTab === 'marketplace'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <span className="hidden sm:inline">Marketplace</span>
          <span className="sm:hidden">Market</span>
          <span className="ml-1">({allPlayers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('owned')}
          className={`flex-shrink-0 py-2 px-2 sm:px-4 rounded-md font-medium transition-colors text-xs sm:text-sm ${
            activeTab === 'owned'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <span className="hidden sm:inline">My Players</span>
          <span className="sm:hidden">Owned</span>
          <span className="ml-1">({ownedPlayers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('trading')}
          className={`flex-shrink-0 py-2 px-2 sm:px-4 rounded-md font-medium transition-colors text-xs sm:text-sm ${
            activeTab === 'trading'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Trading
          {tradeNotifications.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded-full">
              {tradeNotifications.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-shrink-0 py-2 px-2 sm:px-4 rounded-md font-medium transition-colors text-xs sm:text-sm ${
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
                Showing {marketplaceListings.length} of {allPlayers.length} players
              </span>
              {!showAllPlayers && allPlayers.length > 30 && (
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
              {!showAllPlayers && marketplaceListings.length === itemsPerPage && (
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Load More
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
              <StaggeredTransition staggerDelay={50}>
                {marketplaceListings.map((listing) => {
                  const price = calculatePlayerPrice(listing.elo);
                  return (
                    <PlayerCard
                      key={listing.id}
                      player={listing}
                      price={price}
                      userCoinBalance={userCoinBalance}
                      onBuyClick={() => setBuyingPlayer({ player: listing, price: price })}
                      onPlayerClick={() => setSelectedPlayerForModal(listing)}
                    />
                  );
                })}
              </StaggeredTransition>
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
              <StaggeredTransition staggerDelay={50}>
                {ownedPlayers.map((player) => {
                const details = getPlayerDetails(player);
                const price = calculatePlayerPrice(player.elo);
                return (
                  <div key={player.id} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 
                            className="font-semibold text-base sm:text-lg cursor-pointer hover:text-royalBlue transition-colors truncate"
                            onClick={() => setSelectedPlayerForModal(player)}
                            title={player.name}
                          >
                            {player.name}
                          </h3>
                          {details?.country && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                              {details.country}
                            </span>
                          )}
                          {playerTradeStatus[player.id] && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium flex-shrink-0">
                              🔄 Listed for Trade
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                          <p>ELO: {player.elo} • {getPlayerTier(player.elo)}</p>
                          {details?.fide_id && <p>FIDE ID: {details.fide_id}</p>}
                          {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
                            <p>ACL: {details.average_centipawn_loss!.toFixed(1)} ({details.games} games)</p>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            Owned in this league
                          </p>
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                            <p className="text-xs sm:text-sm font-medium text-amber-800">
                              💰 Original Price: {price} 🪙
                            </p>
                            <p className="text-xs sm:text-sm text-amber-700">
                              💸 Sell Price: {Math.floor(price * 0.8)} 🪙 (80%)
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row lg:flex-col space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-2 lg:ml-4 flex-shrink-0">
                        {/* Trade Button */}
                        <button
                          onClick={() => handleCreateTrade(player)}
                          className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base whitespace-nowrap"
                        >
                          🔄 Trade Player
                        </button>
                        {/* Sell to Marketplace (80%) */}
                        <button
                          onClick={async () => {
                            setSellingToMarketplace({ player, price: Math.floor(price * 0.8) });
                          }}
                          className="px-3 py-2 sm:px-4 sm:py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm sm:text-base whitespace-nowrap"
                        >
                          💸 Sell for {Math.floor(price * 0.8)} 🪙
                        </button>
                        {/* List for Sale (custom price) */}
                        <button
                          onClick={() => setSellingPlayer({ player, price: Math.floor(price * 0.8) })}
                          className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm sm:text-base whitespace-nowrap"
                        >
                          📋 List for Sale
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </StaggeredTransition>
            </div>
          )}
        </div>
      )}

      {/* Trading Tab */}
      {activeTab === 'trading' && (
        <TradingTab
          leagueId={leagueId}
          userId={user?.id || ''}
          onTradeUpdate={handleTradeSuccess}
        />
      )}

      {activeTab === 'transactions' && (
        <div className="w-full max-w-full">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transaction history in this league
            </div>
          ) : (
            <div className="space-y-3 w-full">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="w-full border rounded-lg p-3 bg-white shadow-sm">
                  <div className="flex flex-col gap-2">
                    {/* Top row: Icon and amount */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg flex-shrink-0">{getTransactionIcon(transaction.transaction_type)}</span>
                        <span className={`font-semibold text-sm sm:text-base ${getTransactionColor(transaction.amount)}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount} 🪙
                        </span>
                      </div>
                    </div>
                    {/* Bottom row: Description and date */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <p className="font-medium text-sm sm:text-base text-gray-900 break-words">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500 flex-shrink-0">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                const details = getPlayerDetails(buyingPlayer.player);
                return (
                  <>
                    {details?.fide_id && <p className="text-sm text-gray-600">FIDE ID: {details.fide_id}</p>}
                    {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
                      <p>ACL: {details.average_centipawn_loss!.toFixed(1)}% ({details.games} games)</p>
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
                const details = getPlayerDetails(sellingPlayer.player);
                return (
                  <>
                    {details?.fide_id && <p className="text-sm text-gray-600">FIDE ID: {details.fide_id}</p>}
                    {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
                      <p>ACL: {details.average_centipawn_loss!.toFixed(1)}% ({details.games} games)</p>
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
                const details = getPlayerDetails(sellingToMarketplace.player);
                return (
                  <>
                    {details?.fide_id && <p className="text-sm text-gray-600">FIDE ID: {details.fide_id}</p>}
                    {(details?.average_centipawn_loss !== undefined && details?.average_centipawn_loss !== null) ? (
                      <p>ACL: {details.average_centipawn_loss!.toFixed(1)}% ({details.games} games)</p>
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

      {/* Trade Modal */}
      {showTradeModal && tradePlayer && (
        <TradeModal
          player={tradePlayer}
          onClose={() => {
            setShowTradeModal(false);
            setTradePlayer(null);
          }}
          onSuccess={handleTradeSuccess}
          leagueId={leagueId}
          userId={user?.id || ''}
        />
      )}

      {/* Trade Notification Popup */}
      {showNotificationPopup && currentNotification && (
        <TradeNotificationPopup
          notification={currentNotification}
          onAccept={handleNotificationAccept}
          onClose={handleNotificationClose}
          onMarkSeen={handleMarkNotificationSeen}
        />
      )}

      {/* Player Detail Modal */}
      {selectedPlayerForModal && (
        <PlayerDetailModal
          player={selectedPlayerForModal}
          onClose={() => setSelectedPlayerForModal(null)}
        />
      )}
    </div>
  );
}