import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Type definitions for this component
interface MarketplaceListing {
  id: string;
  listing_id: string;
  player_id: string;
  player_name: string;
  player_elo: number;
  player_country?: string;
  price: number;
  seller_id: string;
  seller_name: string;
  seller_type: 'user' | 'bot';
  created_at: string;
}

interface UserPlayer {
  id: string;
  player_id: string;
  player_name: string;
  player_elo: number;
  player_country?: string;
  league_id: string;
  user_id?: string;
  bot_id?: string;
  purchase_price: number;
  created_at: string;
}



interface StarPointTransaction {
  id: string;
  user_id?: string;
  bot_id?: string;
  league_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface StarPointsMarketplaceProps {
  leagueId: string
  userId?: string
  botId?: string
  userStarPoints: number
  onStarPointsUpdate: (newPoints: number) => void
}

const StarPointsMarketplace: React.FC<StarPointsMarketplaceProps> = ({
  leagueId,
  userId,
  botId,
  userStarPoints,
  onStarPointsUpdate
}) => {
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([])
  const [userPlayers, setUserPlayers] = useState<UserPlayer[]>([])

  const [transactions, setTransactions] = useState<StarPointTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-players' | 'transactions'>('marketplace')
  const [sellPlayer, setSellPlayer] = useState<{ player: UserPlayer; price: number } | null>(null)
  const [buyPlayer, setBuyPlayer] = useState<MarketplaceListing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadMarketplaceData()
  }, [leagueId, userId, botId])

  const loadMarketplaceData = async () => {
    setLoading(true)
    try {
      // Load marketplace listings
      const { data: listings } = await supabase
        .rpc('get_marketplace_listings', { league_uuid: leagueId })

      if (listings) {
        setMarketplaceListings(listings)
      }

      // Load user's/bot's players
      const { data: players } = await supabase
        .from('user_players')
        .select(`
          *,
          chess_players (
            name,
            elo,
            country
          )
        `)
        .eq(userId ? 'user_id' : 'bot_id', userId || botId)
        .eq('league_id', leagueId)

      if (players) {
        const formattedPlayers = players.map(player => ({
          ...player,
          player_name: player.chess_players?.name,
          player_elo: player.chess_players?.elo,
          player_country: player.chess_players?.country
        }))
        setUserPlayers(formattedPlayers)
      }



      // Load transactions
      const { data: txns } = await supabase
        .rpc('get_user_star_points_history', { 
          user_uuid: userId || null, 
          bot_uuid: botId || null,
          league_uuid: leagueId 
        })

      if (txns) {
        setTransactions(txns)
      }

    } catch (error) {
      console.error('Error loading marketplace data:', error)
      setError('Failed to load marketplace data')
    } finally {
      setLoading(false)
    }
  }

  const handleBuyFromMarketplace = async (listing: MarketplaceListing) => {
    setBuyPlayer(listing)
  }

  const confirmBuyPlayer = async () => {
    if (!buyPlayer) return

    try {
      const { data, error } = await supabase
        .rpc('buy_player_from_marketplace', {
          marketplace_id: buyPlayer.listing_id,
          buyer_uuid: userId || null,
          buyer_bot_uuid: botId || null
        })

      if (error) throw error

      if (data) {
        setSuccess('Player purchased successfully!')
        setBuyPlayer(null)
        await loadMarketplaceData()
        
        // Update user's/bot's star points
        const newBalance = userStarPoints - buyPlayer.price
        onStarPointsUpdate(newBalance)
      } else {
        setError('Failed to purchase player. Insufficient star points or player already owned.')
      }
    } catch (error) {
      console.error('Error buying player:', error)
      setError('Failed to purchase player')
    }
  }

  const handleSellPlayer = async (player: UserPlayer) => {
    const suggestedPrice = Math.floor(player.purchase_price * 0.8) // 80% of purchase price
    setSellPlayer({ player, price: suggestedPrice })
  }

  const confirmSellPlayer = async () => {
    if (!sellPlayer) return

    try {
      const { data, error } = await supabase
        .rpc('list_player_for_sale', {
          user_uuid: userId || null,
          bot_uuid: botId || null,
          league_uuid: leagueId,
          player_uuid: sellPlayer.player.player_id,
          price: sellPlayer.price
        })

      if (error) throw error

      if (data) {
        setSuccess('Player listed for sale successfully!')
        setSellPlayer(null)
        await loadMarketplaceData()
      } else {
        setError('Failed to list player for sale')
      }
    } catch (error) {
      console.error('Error selling player:', error)
      setError('Failed to list player for sale')
    }
  }

  const handleSellToSystem = async (player: UserPlayer) => {
    try {
      const { data, error } = await supabase
        .rpc('sell_player_to_system', {
          user_uuid: userId || null,
          bot_uuid: botId || null,
          league_uuid: leagueId,
          player_uuid: player.player_id
        })

      if (error) throw error

      if (data) {
        setSuccess('Player sold to system successfully!')
        await loadMarketplaceData()
        
        // Update user's/bot's star points
        const refundAmount = Math.floor(player.purchase_price * 0.7)
        const newBalance = userStarPoints + refundAmount
        onStarPointsUpdate(newBalance)
      } else {
        setError('Failed to sell player to system')
      }
    } catch (error) {
      console.error('Error selling to system:', error)
      setError('Failed to sell player to system')
    }
  }



  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Star Points Marketplace</h2>
        <div className="text-right">
          <div className="text-sm text-gray-600">Your Star Points</div>
          <div className="text-2xl font-bold text-yellow-600">{userStarPoints} ⭐</div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
          <button 
            onClick={() => setSuccess(null)}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'marketplace'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Marketplace
        </button>
        <button
          onClick={() => setActiveTab('my-players')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'my-players'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Players ({userPlayers.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'transactions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Transaction History
        </button>
      </div>

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Players</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketplaceListings.map((listing) => (
              <div key={listing.listing_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-800">{listing.player_name}</h4>
                  <span className="text-sm text-gray-600">ELO {listing.player_elo}</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {listing.player_country}
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold text-yellow-600">{listing.price} ⭐</span>
                  <span className="text-xs text-gray-500">by {listing.seller_name}</span>
                </div>
                <button
                  onClick={() => handleBuyFromMarketplace(listing)}
                  disabled={userStarPoints < listing.price}
                  className={`w-full py-2 px-4 rounded ${
                    userStarPoints >= listing.price
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {userStarPoints >= listing.price ? 'Buy Player' : 'Insufficient Points'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Players Tab */}
      {activeTab === 'my-players' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Player Collection</h3>
          {userPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              You don't own any players yet. Visit the marketplace to buy some!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPlayers.map((player) => (
                <div key={player.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{player.player_name}</h4>
                    <span className="text-sm text-gray-600">ELO {player.player_elo}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {player.player_country}
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    Purchased for {player.purchase_price} ⭐
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSellPlayer(player)}
                      className="flex-1 py-2 px-3 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      List for Sale
                    </button>
                    <button
                      onClick={() => handleSellToSystem(player)}
                      className="flex-1 py-2 px-3 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Sell to System
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{txn.description}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      txn.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.amount > 0 ? '+' : ''}{txn.amount} ⭐
                    </div>
                    <div className="text-sm text-gray-500">
                      Balance: {txn.balance_after} ⭐
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buy Player Modal */}
      {buyPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Purchase</h3>
            <p className="mb-4">
              Buy <strong>{buyPlayer.player_name}</strong> for <strong>{buyPlayer.price} ⭐</strong>?
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Current balance: {userStarPoints} ⭐
              <br />
              New balance: {userStarPoints - buyPlayer.price} ⭐
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmBuyPlayer}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm Purchase
              </button>
              <button
                onClick={() => setBuyPlayer(null)}
                className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Player Modal */}
      {sellPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">List Player for Sale</h3>
            <p className="mb-4">
              List <strong>{sellPlayer.player.player_name}</strong> for sale?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sale Price (⭐)
              </label>
              <input
                type="number"
                value={sellPlayer.price}
                onChange={(e) => setSellPlayer({
                  ...sellPlayer,
                  price: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmSellPlayer}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
              >
                List for Sale
              </button>
              <button
                onClick={() => setSellPlayer(null)}
                className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StarPointsMarketplace 