import React from 'react'
import { X, ExternalLink, TrendingUp, Trophy, Target } from 'lucide-react'
import { ChessPlayer } from '../types'
import { useNavigate } from 'react-router-dom'

interface PlayerDetailModalProps {
  player: ChessPlayer
  onClose: () => void
}

const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({ player, onClose }) => {
  const navigate = useNavigate()

  const handleViewHistory = () => {
    // Create URL-friendly player name (lowercase, no spaces)
    const urlName = player.name.toLowerCase().replace(/\s+/g, '')
    navigate(`/player/${urlName}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-royalBlue to-blue-600 text-white p-6 rounded-t-xl flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">{player.name}</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full">
                ELO: {player.elo}
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full">
                {player.title || 'GM'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-royalBlue" />
              <div className="text-2xl font-bold text-royalBlue">{player.elo}</div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">
                {player.accuracy?.toFixed(1) || player.average_centipawn_loss?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Avg ACL</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-amber-600" />
              <div className="text-2xl font-bold text-amber-600">
                {player.games || '0'}
              </div>
              <div className="text-sm text-gray-600">Games Played</div>
            </div>
          </div>

          {/* About */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 text-gray-900">About</h3>
            <div className="space-y-2 text-gray-700">
              <p><strong>Full Name:</strong> {player.name}</p>
              <p><strong>Title:</strong> {player.title || 'Grandmaster'}</p>
              <p><strong>Rating:</strong> {player.elo}</p>
              {player.country && <p><strong>Country:</strong> {player.country}</p>}
            </div>
          </div>

          {/* Chess.com Link */}
          <a
            href={`https://www.chess.com/member/${player.username || player.name.toLowerCase().replace(/\s+/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            View Profile on Chess.com
          </a>

          {/* View Full History Button */}
          <button
            onClick={handleViewHistory}
            className="w-full bg-royalBlue hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            View Complete Titled Tuesday History
          </button>

          {/* Performance Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>💡 Pro Tip:</strong> Check their full history to see performance trends, 
              past tournament results, and detailed game statistics from previous Titled Tuesdays.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerDetailModal

