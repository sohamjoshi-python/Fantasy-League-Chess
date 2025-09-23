import { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, Coins } from 'lucide-react';
import { acceptTrade, markNotificationSeen } from '../lib/supabase';
import { TradeNotificationWithDetails } from '../types';

interface TradeNotificationPopupProps {
  notification: TradeNotificationWithDetails;
  onAccept: (notification: TradeNotificationWithDetails) => void;
  onClose: () => void;
  onMarkSeen: (notificationId: string) => void;
}

export default function TradeNotificationPopup({
  notification,
  onAccept,
  onClose,
  onMarkSeen
}: TradeNotificationPopupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await acceptTrade(notification.trade_id, notification.notification_id);
      
      if (result.success) {
        onAccept(notification);
        onMarkSeen(notification.notification_id);
        onClose();
      } else {
        setError(result.error?.message || 'Failed to accept trade');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    await markNotificationSeen(notification.notification_id);
    onMarkSeen(notification.notification_id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Coins className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Trade Offer</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trade Details */}
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">{notification.seller_name}</span> wants to trade:
            </p>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{notification.player_name}</h4>
                <p className="text-sm text-gray-600">ELO: {notification.player_elo}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 text-yellow-600">
                  <Coins className="w-4 h-4" />
                  <span className="font-bold text-lg">{notification.price}</span>
                </div>
                <p className="text-xs text-gray-500">coins</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>{loading ? 'Accepting...' : 'Accept Trade'}</span>
            </button>
            
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Decline</span>
            </button>
          </div>

          {/* Expiry Info */}
          <div className="text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Trade expires in 72 hours</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
