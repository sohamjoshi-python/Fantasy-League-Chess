import { memo } from 'react';
import { ChessPlayer } from '../types';
import { calculatePlayerPrice, getPlayerTier } from '../types/coin-system';

interface PlayerCardProps {
  player: ChessPlayer;
  userCoinBalance: number | null;
  canBuy: boolean;
  isUserTurn: boolean;
  onBuyClick: (player: ChessPlayer) => void;
}

const PlayerCard = memo<PlayerCardProps>(({ 
  player, 
  userCoinBalance, 
  canBuy, 
  isUserTurn, 
  onBuyClick 
}) => {
  const price = calculatePlayerPrice(player.elo);
  const details = getPlayerDetails(player.name);
  const canAfford = userCoinBalance !== null && userCoinBalance >= price;

  const handleBuyClick = () => {
    if (canBuy && isUserTurn && canAfford) {
      onBuyClick(player);
    }
  };

  return (
    <div className={`border rounded-lg p-6 transition-all duration-300 ease-in-out hover:shadow-lg transform hover:scale-[1.02] ${
      canAfford ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
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
              onClick={handleBuyClick}
              disabled={!userCoinBalance || userCoinBalance < price}
              className={`mt-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ease-in-out transform hover:scale-105 ${
                userCoinBalance && userCoinBalance >= price
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {userCoinBalance && userCoinBalance >= price ? 'Buy Player' : 'Insufficient Coins'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

// Helper function to get player details
function getPlayerDetails(_name: string): any {
  // Add any special player details logic here
  return null;
}

export default PlayerCard;
