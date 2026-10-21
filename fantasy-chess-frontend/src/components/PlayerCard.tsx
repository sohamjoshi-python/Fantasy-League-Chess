import { memo } from 'react';
import { ChessPlayer } from '../types';
import { calculatePlayerPrice, getPlayerTier } from '../types/coin-system';

interface PlayerCardProps {
  player: ChessPlayer;
  userCoinBalance: number | null;
  canBuy: boolean;
  isUserTurn: boolean;
  onBuyClick: (player: ChessPlayer) => void;
  currencyType?: 'gems' | 'coins'; // New prop to specify currency type
  onPlayerClick?: (player: ChessPlayer) => void; // Optional click handler for player name
}

const PlayerCard = memo<PlayerCardProps>(({ 
  player, 
  userCoinBalance, 
  canBuy, 
  isUserTurn, 
  onBuyClick,
  currencyType = 'coins', // Default to coins for backward compatibility
  onPlayerClick
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
    <div className={`border rounded-lg p-4 sm:p-6 transition-shadow duration-300 ease-in-out hover:shadow-lg ${
      canAfford ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
    }`}>
      {canAfford && (
        <div className="mb-2">
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
            ✓ Affordable
          </span>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h5 
              className={`font-semibold text-base sm:text-lg break-words ${onPlayerClick ? 'cursor-pointer hover:text-royalBlue transition-colors' : ''}`}
              onClick={() => onPlayerClick?.(player)}
            >
              {player.name}
            </h5>
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
          </div>
        </div>
        <div className="sm:text-right sm:ml-4 shrink-0">
          <div className="text-xl sm:text-2xl font-bold text-amber-600">
            {price} {currencyType === 'gems' ? '💎' : '🪙'}
          </div>
          {isUserTurn && canBuy && (
            <button
              onClick={handleBuyClick}
              disabled={!userCoinBalance || userCoinBalance < price}
              className={`mt-2 w-full sm:w-auto px-4 py-2 rounded-md font-medium transition-colors duration-200 ease-in-out ${
                userCoinBalance && userCoinBalance >= price
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {userCoinBalance && userCoinBalance >= price 
                ? 'Buy Player' 
                : `Insufficient ${currencyType === 'gems' ? 'GEMS' : 'Coins'}`
              }
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
