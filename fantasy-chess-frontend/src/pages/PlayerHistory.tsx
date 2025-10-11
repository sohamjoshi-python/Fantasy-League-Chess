import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Trophy, TrendingUp, Target, Calendar, Award } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ChessPlayer } from '../types'

interface GameResult {
  id: string
  date: string
  white: string
  black: string
  result: string
  white_accuracy: number | null
  black_accuracy: number | null
  round: string | null
  white_points: number | null
  black_points: number | null
  early_late: string
}

interface WeeklyPerformance {
  week_start_date: string
  total_points: number
  games_played: number
  wins: number
  draws: number
  losses: number
  average_acl: number | null
  best_acl: number | null
  worst_acl: number | null
}

const PlayerHistory: React.FC = () => {
  const { playerName } = useParams<{ playerName: string }>()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<ChessPlayer | null>(null)
  const [weeklyPerformances, setWeeklyPerformances] = useState<WeeklyPerformance[]>([])
  const [recentGames, setRecentGames] = useState<GameResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'games'>('overview')

  useEffect(() => {
    if (playerName) {
      loadPlayerData()
    }
  }, [playerName])

  const loadPlayerData = async () => {
    try {
      setLoading(true)
      console.log('Loading player data for:', playerName)

      // Convert URL player name back to actual player name
      // URL format: "magnuscarlsen" -> Need to find actual "Magnus Carlsen"
      const { data: allPlayers, error: searchError } = await supabase
        .from('chess_players')
        .select('*')

      if (searchError) throw searchError

      // Find player by matching URL-friendly name
      const playerData = allPlayers?.find(p => 
        p.name.toLowerCase().replace(/\s+/g, '') === playerName?.toLowerCase()
      )

      if (!playerData) {
        console.error('Player not found for URL:', playerName)
        setLoading(false)
        return
      }

      console.log('Found player:', playerData.name)
      setPlayer(playerData)

      // Load weekly performance
      console.log('Loading weekly performance for player ID:', playerData.id)
      const { data: perfData, error: perfError } = await supabase
        .rpc('get_player_weekly_performance', { p_player_id: playerData.id })

      if (perfError) {
        console.error('Error loading weekly performance:', perfError)
      } else {
        console.log('Weekly performance data:', perfData)
        setWeeklyPerformances(perfData || [])
      }

      // Load recent games from the games table (uses player names, not IDs)
      console.log('Loading games for player name:', playerData.name)
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .or(`white.eq."${playerData.name}",black.eq."${playerData.name}"`)
        .order('date', { ascending: false })
        .limit(20)

      if (gamesError) {
        console.error('Error loading games:', gamesError)
      } else {
        console.log('Loaded games:', gamesData?.length)
        setRecentGames(gamesData as GameResult[] || [])
      }
    } catch (error) {
      console.error('Error loading player data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getResultDisplay = (game: GameResult, playerName: string) => {
    const isWhite = game.white === playerName
    if (game.result === '1-0') {
      return isWhite ? 'Won' : 'Lost'
    } else if (game.result === '0-1') {
      return isWhite ? 'Lost' : 'Won'
    } else if (game.result === '1/2-1/2') {
      return 'Draw'
    } else {
      return 'Draw'
    }
  }

  const getResultColor = (result: string) => {
    if (result === 'Won') return 'text-green-600 bg-green-50'
    if (result === 'Lost') return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royalBlue"></div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Player Not Found</h2>
          <button
            onClick={() => navigate(-1)}
            className="text-royalBlue hover:text-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const totalStats = weeklyPerformances.reduce(
    (acc, week) => ({
      totalGames: acc.totalGames + week.games_played,
      totalWins: acc.totalWins + week.wins,
      totalDraws: acc.totalDraws + week.draws,
      totalLosses: acc.totalLosses + week.losses,
      totalPoints: acc.totalPoints + week.total_points,
    }),
    { totalGames: 0, totalWins: 0, totalDraws: 0, totalLosses: 0, totalPoints: 0 }
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        {/* Player Header */}
        <div className="bg-gradient-to-r from-royalBlue to-blue-600 rounded-xl shadow-lg p-8 mb-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-3">{player.name}</h1>
              <div className="flex items-center gap-4">
                <span className="bg-white/20 px-4 py-2 rounded-full text-lg">
                  {player.title || 'GM'}
                </span>
                <span className="bg-white/20 px-4 py-2 rounded-full text-lg">
                  ELO: {player.elo}
                </span>
                {player.country && (
                  <span className="bg-white/20 px-4 py-2 rounded-full text-lg">
                    {player.country}
                  </span>
                )}
              </div>
            </div>
            <a
              href={`https://www.chess.com/member/${player.username || player.name.toLowerCase().replace(/\s+/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Chess.com Profile
            </a>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <Trophy className="w-8 h-8 text-royalBlue mb-2" />
            <div className="text-3xl font-bold text-gray-900">{totalStats.totalPoints.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <Target className="w-8 h-8 text-green-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900">{totalStats.totalGames}</div>
            <div className="text-sm text-gray-600">Games Played</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <Award className="w-8 h-8 text-amber-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900">
              {totalStats.totalGames > 0
                ? ((totalStats.totalWins / totalStats.totalGames) * 100).toFixed(1)
                : '0'}%
            </div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900">
              {player.accuracy?.toFixed(1) || player.average_centipawn_loss?.toFixed(1) || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Average ACL</div>
          </div>
        </div>

        {/* Record */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Overall Record</h3>
          <div className="flex gap-8">
            <div>
              <div className="text-3xl font-bold text-green-600">{totalStats.totalWins}</div>
              <div className="text-sm text-gray-600">Wins</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-600">{totalStats.totalDraws}</div>
              <div className="text-sm text-gray-600">Draws</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">{totalStats.totalLosses}</div>
              <div className="text-sm text-gray-600">Losses</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 font-semibold ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-royalBlue text-royalBlue'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Calendar className="w-5 h-5 inline mr-2" />
                Weekly Performance
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`px-6 py-4 font-semibold ${
                  activeTab === 'games'
                    ? 'border-b-2 border-royalBlue text-royalBlue'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Trophy className="w-5 h-5 inline mr-2" />
                Recent Games
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {weeklyPerformances.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No performance data available yet.</p>
                ) : (
                  weeklyPerformances.map((week) => (
                    <div
                      key={week.week_start_date}
                      className="border border-gray-200 rounded-lg p-4 hover:border-royalBlue transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Week of {new Date(week.week_start_date).toLocaleDateString()}
                          </h4>
                          <p className="text-sm text-gray-600">{week.games_played} games played</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-royalBlue">
                            {week.total_points.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">points</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">W/D/L:</span>
                          <span className="ml-2 font-semibold">
                            {week.wins}/{week.draws}/{week.losses}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg ACL:</span>
                          <span className="ml-2 font-semibold">
                            {week.average_acl?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Best ACL:</span>
                          <span className="ml-2 font-semibold text-green-600">
                            {week.best_acl?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Worst ACL:</span>
                          <span className="ml-2 font-semibold text-red-600">
                            {week.worst_acl?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'games' && (
              <div className="space-y-3">
                {recentGames.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No game results available yet.</p>
                ) : (
                  recentGames.map((game) => {
                    if (!player) return null
                    const isWhite = game.white === player.name
                    const result = getResultDisplay(game, player.name)
                    const opponent = isWhite ? game.black : game.white
                    const playerACL = isWhite ? game.white_accuracy : game.black_accuracy

                    return (
                      <div
                        key={game.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-royalBlue transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold ${getResultColor(
                                  result
                                )}`}
                              >
                                {result}
                              </span>
                              <span className="text-gray-600">vs</span>
                              <span className="font-semibold text-gray-900">{opponent}</span>
                              <span className="text-gray-600 text-sm">
                                ({isWhite ? 'White' : 'Black'})
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>
                                {new Date(game.date).toLocaleDateString()}
                              </span>
                              {playerACL && (
                                <span>
                                  ACL: <span className="font-semibold">{playerACL.toFixed(1)}</span>
                                </span>
                              )}
                              {game.round && <span>Round {game.round}</span>}
                              <span className="capitalize">{game.early_late}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerHistory

