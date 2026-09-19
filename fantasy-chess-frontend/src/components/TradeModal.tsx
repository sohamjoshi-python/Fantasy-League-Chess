import React, { useState } from 'react';
import { X, Coins, AlertCircle } from 'lucide-react';
import { createTrade } from '../lib/supabase';
import { ChessPlayer } from '../types';

interface TradeModalProps {
  player: ChessPlayer;
  onClose: () => void;
  onSuccess: () => void;
  leagueId: string;
  userId: string;
}

export default function TradeModal({
  player,
  onClose,
  onSuccess,
  leagueId,
  userId
}: TradeModalProps) {
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createTrade(leagueId, userId, player.id, price);
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error?.message || 'Failed to create trade');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Coins className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Trade Player</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 className="font-semibold text-gray-900">{player.name}</h4>
          <p className="text-sm text-gray-600">ELO: {player.elo}</p>
        </div>

        {/* Trade Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              Set Price (coins)
            </label>
            <div className="relative">
              <input
                type="number"
                id="price"
                value={price}
                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter price in coins"
                required
              />
              <div className="absolute right-3 top-2.5">
                <Coins className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your player will be removed from your team but you can still see them in "My Players" and cancel the trade anytime. The trade expires in 72 hours.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading || price <= 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Coins className="w-4 h-4" />
              )}
              <span>{loading ? 'Creating...' : 'Create Trade'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
