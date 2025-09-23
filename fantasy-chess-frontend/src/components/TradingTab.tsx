import { useState, useEffect } from 'react';
import { Clock, Coins, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getAllTrades, cancelTrade, acceptTrade } from '../lib/supabase';
import { Trade, ChessPlayer } from '../types';

interface TradingTabProps {
  leagueId: string;
  userId: string;
  onTradeUpdate: () => void;
}

interface TradeWithDetails extends Trade {
  chess_players: ChessPlayer;
  seller: { username: string };
  buyer?: { username: string };
}

export default function TradingTab({
  leagueId,
  userId,
  onTradeUpdate
}: TradingTabProps) {
  const [trades, setTrades] = useState<TradeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingTrade, setCancellingTrade] = useState<string | null>(null);
  const [acceptingTrade, setAcceptingTrade] = useState<string | null>(null);

  const loadTrades = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAllTrades(leagueId);
      
      if (result.success) {
        // Only show pending trades - completed trades will show in transaction history
        const pendingTrades = (result.trades || []).filter(trade => trade.status === 'pending');
        setTrades(pendingTrades);
      } else {
        setError(result.error?.message || 'Failed to load trades');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, [leagueId]);

  const handleCancelTrade = async (tradeId: string) => {
    setCancellingTrade(tradeId);
    
    try {
      const result = await cancelTrade(tradeId, userId);
      
      if (result.success) {
        await loadTrades();
        onTradeUpdate();
      } else {
        setError(result.error?.message || 'Failed to cancel trade');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setCancellingTrade(null);
    }
  };

  const handleAcceptTrade = async (tradeId: string) => {
    setAcceptingTrade(tradeId);
    
    try {
      const result = await acceptTrade(tradeId, userId);
      
      if (result.success) {
        await loadTrades();
        onTradeUpdate();
      } else {
        setError(result.error?.message || 'Failed to accept trade');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setAcceptingTrade(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'expired': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const isUserTrade = (trade: TradeWithDetails) => trade.seller_id === userId;
  const canCancel = (trade: TradeWithDetails) => 
    isUserTrade(trade) && trade.status === 'pending';
  const canAccept = (trade: TradeWithDetails) => 
    !isUserTrade(trade) && trade.status === 'pending';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-gray-600">Loading trades...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Active Trades</h3>
        <button
          onClick={loadTrades}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Trades List */}
      {trades.length === 0 ? (
        <div className="text-center py-8">
          <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No active trades</p>
          <p className="text-sm text-gray-500">Trades will appear here when players are listed for sale</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                {/* Trade Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {trade.chess_players.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        ELO: {trade.chess_players.elo}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <Coins className="w-4 h-4" />
                      <span className="font-bold">{trade.price}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                    <span>
                      Seller: <span className="font-medium">{trade.seller.username}</span>
                    </span>
                    {trade.buyer && (
                      <span>
                        Buyer: <span className="font-medium">{trade.buyer.username}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center space-x-3">
                  {/* Status Badge */}
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                    {getStatusIcon(trade.status)}
                    <span className="capitalize">{trade.status}</span>
                  </div>

                  {/* Time Remaining */}
                  {trade.status === 'pending' && (
                    <div className="text-sm text-gray-500">
                      {formatTimeRemaining(trade.expires_at)}
                    </div>
                  )}

                  {/* Accept Button */}
                  {canAccept(trade) && (
                    <button
                      onClick={() => handleAcceptTrade(trade.id)}
                      disabled={acceptingTrade === trade.id}
                      className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-1"
                    >
                      {acceptingTrade === trade.id ? (
                        <div className="w-3 h-3 border border-green-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      <span>Accept</span>
                    </button>
                  )}

                  {/* Cancel Button */}
                  {canCancel(trade) && (
                    <button
                      onClick={() => handleCancelTrade(trade.id)}
                      disabled={cancellingTrade === trade.id}
                      className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-1"
                    >
                      {cancellingTrade === trade.id ? (
                        <div className="w-3 h-3 border border-red-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How Trading Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Only pending trades are shown here</li>
          <li>• Completed trades appear in transaction history</li>
          <li>• Players are removed from your team when listed for trade</li>
          <li>• You can still see them in "My Players" and cancel anytime</li>
          <li>• Trades expire after 72 hours and players return to original owner</li>
          <li>• All league members get notified of new trade offers</li>
        </ul>
      </div>
    </div>
  );
}
