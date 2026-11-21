import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Trophy, TrendingUp, Target, Calendar, Award, Medal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ChessPlayer } from '../types'
import { formatCalendarDate } from '../lib/leagueStatus'
import { ordinal } from '../lib/weeklyRecap'
import { PlayerHistorySkeleton } from '../components/ui/LoadingSpinner'
import { FinishPlacesChart, PointsByWeekChart } from '../components/PlayerTrendCharts'

interface TitledTuesdayFinish {
  slug: string
  session: string | null
  event_date: string | null
  starts_at: string | null
  total_rounds: number | null
  url: string | null
  placement: number | null
  total_players: number | null
  wins: number
  draws: number
  losses: number
}

const FINISHES_PREVIEW = 25

function finishSortKey(finish: TitledTuesdayFinish) {
  return finish.starts_at || finish.event_date || ''
}

function finishScore(finish: TitledTuesdayFinish) {
  const score = finish.wins + finish.draws / 2
  const text = Number.isInteger(score) ? String(score) : score.toFixed(1)
  return `${text}/${finish.total_rounds || finish.wins + finish.draws + finish.losses}`
}

function placementClass(placement: number | null) {
  if (placement === 1) return 'bg-amber-100 text-amber-800 border-amber-300'
  if (placement === 2) return 'bg-gray-100 text-gray-700 border-gray-300'
  if (placement === 3) return 'bg-orange-100 text-orange-800 border-orange-300'
  if (placement !== null && placement <= 10) return 'bg-blue-50 text-royalBlue border-blue-200'
  return 'bg-white text-gray-700 border-gray-200'
}

function monthYear(isoDate: string) {
  const [year, month] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

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

const PLAYER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function nameSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function nameMatchesUrl(player: ChessPlayer, urlName: string) {
  const slug = nameSlug(urlName)
  if (!slug) return false
  const nameParts = player.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const username = nameSlug(player.username || '')
  return nameParts.join('') === slug || username === slug || nameParts[0] === slug
}

function weekStartMonday(gameDate: string): string {
  const match = gameDate.trim().replace(/\./g, '-').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return gameDate
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  const daysToMonday = date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1
  date.setUTCDate(date.getUTCDate() - daysToMonday)
  return date.toISOString().slice(0, 10)
}

function buildWeeklyPerformances(games: GameResult[], playerName: string): WeeklyPerformance[] {
  const weeks = new Map<string, WeeklyPerformance & { aclSum: number; aclCount: number }>()

  for (const game of games) {
    const isWhite = game.white === playerName
    const points = Number(isWhite ? game.white_points : game.black_points) || 0
    const acl = isWhite ? game.white_accuracy : game.black_accuracy
    const won = (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1')
    const lost = (isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0')
    const weekStart = weekStartMonday(game.date)
    const week = weeks.get(weekStart) || {
      week_start_date: weekStart,
      total_points: 0,
      games_played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      average_acl: null,
      best_acl: null,
      worst_acl: null,
      aclSum: 0,
      aclCount: 0,
    }

    week.games_played += 1
    week.total_points += points
    if (won) week.wins += 1
    else if (lost) week.losses += 1
    else week.draws += 1

    if (acl !== null && acl !== undefined && !Number.isNaN(Number(acl))) {
      const aclValue = Number(acl)
      week.aclSum += aclValue
      week.aclCount += 1
      week.best_acl = week.best_acl === null ? aclValue : Math.min(week.best_acl, aclValue)
      week.worst_acl = week.worst_acl === null ? aclValue : Math.max(week.worst_acl, aclValue)
    }

    weeks.set(weekStart, week)
  }

  return Array.from(weeks.values())
    .map((week) => ({
      week_start_date: week.week_start_date,
      total_points: week.total_points,
      games_played: week.games_played,
      wins: week.wins,
      draws: week.draws,
      losses: week.losses,
      average_acl: week.aclCount > 0 ? week.aclSum / week.aclCount : null,
      best_acl: week.best_acl,
      worst_acl: week.worst_acl,
    }))
    .sort((a, b) => b.week_start_date.localeCompare(a.week_start_date))
}

const PlayerHistory: React.FC = () => {
  const { playerName } = useParams<{ playerName: string }>()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<ChessPlayer | null>(null)
  const [weeklyPerformances, setWeeklyPerformances] = useState<WeeklyPerformance[]>([])
  const [recentGames, setRecentGames] = useState<GameResult[]>([])
  const [finishes, setFinishes] = useState<TitledTuesdayFinish[]>([])
  const [showAllFinishes, setShowAllFinishes] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'finishes' | 'games'>('overview')

  useEffect(() => {
    if (playerName) {
      loadPlayerData()
    }
  }, [playerName])

  const loadPlayerData = async () => {
    try {
      setLoading(true)
      let playerData: ChessPlayer | null = null

      if (playerName && PLAYER_ID_PATTERN.test(playerName)) {
        const { data, error } = await supabase
          .from('chess_players')
          .select('*')
          .eq('id', playerName)
          .maybeSingle()

        if (error) throw error
        playerData = data
      } else if (playerName) {
        // Older links used a shortened name such as "hikaru". The table is
        // larger than one PostgREST page, so scan every page.
        const pageSize = 1000
        const slug = nameSlug(playerName)
        const looseMatches: ChessPlayer[] = []
        let exactMatch: ChessPlayer | null = null

        for (let page = 0; page < 20 && !exactMatch; page += 1) {
          const { data, error } = await supabase
            .from('chess_players')
            .select('*')
            .order('id')
            .range(page * pageSize, (page + 1) * pageSize - 1)

          if (error) throw error
          if (!data || data.length === 0) break

          for (const candidate of data) {
            if (!nameMatchesUrl(candidate, playerName)) continue
            const candidateSlug = nameSlug(candidate.name)
            const usernameSlug = nameSlug(candidate.username || '')
            if (candidateSlug === slug || usernameSlug === slug) {
              exactMatch = candidate
              break
            }
            looseMatches.push(candidate)
          }

          if (data.length < pageSize) break
        }

        playerData = exactMatch || (looseMatches.length === 1 ? looseMatches[0] : null)
      }

      if (!playerData) {
        console.error('Player not found for URL:', playerName)
        setPlayer(null)
        setLoading(false)
        return
      }

      setPlayer(playerData)

      // Titled Tuesday results live in games, keyed by player name.
      // get_player_weekly_performance reads game_results, which this ingest does not fill.
      const [{ data: gamesData, error: gamesError }, { data: finishData, error: finishError }] = await Promise.all([
        supabase
          .from('games')
          .select('*')
          .or(`white.eq."${playerData.name}",black.eq."${playerData.name}"`)
          .order('date', { ascending: false })
          .limit(1000),
        supabase
          .from('titled_tuesday_results')
          .select('event_slug, placement, total_players, wins, draws, losses, titled_tuesday_events(session, event_date, starts_at, total_rounds, url)')
          .eq('player_id', playerData.id)
          .limit(2000),
      ])

      if (finishError) {
        console.error('Error loading Titled Tuesday finishes:', finishError)
        setFinishes([])
      } else {
        const rows = (finishData || []).map((row: any) => {
          const event = Array.isArray(row.titled_tuesday_events) ? row.titled_tuesday_events[0] : row.titled_tuesday_events
          return {
            slug: row.event_slug,
            session: event?.session ?? null,
            event_date: event?.event_date ?? null,
            starts_at: event?.starts_at ?? null,
            total_rounds: event?.total_rounds ?? null,
            url: event?.url ?? null,
            placement: row.placement,
            total_players: row.total_players,
            wins: row.wins || 0,
            draws: row.draws || 0,
            losses: row.losses || 0,
          } as TitledTuesdayFinish
        })
        rows.sort((a, b) => finishSortKey(b).localeCompare(finishSortKey(a)))
        setFinishes(rows)
      }

      if (gamesError) {
        console.error('Error loading games:', gamesError)
        setRecentGames([])
        setWeeklyPerformances([])
      } else {
        const games = (gamesData || []) as GameResult[]
        setRecentGames(games)
        setWeeklyPerformances(buildWeeklyPerformances(games, playerData.name))
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
    return <PlayerHistorySkeleton />
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

  const firstTrackedWeek = weeklyPerformances.length
    ? weeklyPerformances[weeklyPerformances.length - 1].week_start_date
    : null
  const trackedLabel = firstTrackedWeek ? `Since ${monthYear(firstTrackedWeek)}` : 'Tracked games'

  const finishesByWeek = new Map<string, TitledTuesdayFinish[]>()
  for (const finish of finishes) {
    if (!finish.event_date) continue
    const week = weekStartMonday(finish.event_date)
    finishesByWeek.set(week, [...(finishesByWeek.get(week) || []), finish])
  }

  const hasCareer = player.tt_career_games !== null && player.tt_career_games !== undefined
  const topTenFinishes = finishes.filter((finish) => finish.placement !== null && finish.placement <= 10).length
  const visibleFinishes = showAllFinishes ? finishes : finishes.slice(0, FINISHES_PREVIEW)

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
        <div className="bg-gradient-to-r from-royalBlue to-blue-600 rounded-xl shadow-lg p-5 sm:p-8 mb-6 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-4xl font-bold mb-3 break-words">{player.name}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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

        {/* Career totals from Chess.com */}
        {hasCareer && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h3 className="text-xl font-bold text-gray-900">Titled Tuesday Career</h3>
              <span className="text-xs text-gray-500">All-time, from Chess.com</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">{player.tt_career_events ?? 0}</div>
                <div className="text-sm text-gray-600">Events</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{(player.tt_career_games ?? 0).toLocaleString()}</div>
                <div className="text-sm text-gray-600">Games Played</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {player.tt_career_wins ?? 0}-{player.tt_career_draws ?? 0}-{player.tt_career_losses ?? 0}
                </div>
                <div className="text-sm text-gray-600">W-D-L</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {player.tt_best_finish ? ordinal(player.tt_best_finish) : '-'}
                </div>
                <div className="text-sm text-gray-600">Best Finish</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{player.tt_event_wins ?? 0}</div>
                <div className="text-sm text-gray-600">Event Wins</div>
              </div>
            </div>
          </div>
        )}

        {/* Overall Stats */}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Fantasy stats · {trackedLabel}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <Trophy className="w-8 h-8 text-royalBlue mb-2" />
            <div className="text-3xl font-bold text-gray-900">{totalStats.totalPoints.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <Target className="w-8 h-8 text-green-600 mb-2" />
            <div className="text-3xl font-bold text-gray-900">{totalStats.totalGames}</div>
            <div className="text-sm text-gray-600">Games Tracked</div>
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
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Record <span className="text-base font-normal text-gray-500">({trackedLabel.toLowerCase()})</span>
          </h3>
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
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 font-semibold whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-royalBlue text-royalBlue'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Calendar className="w-5 h-5 inline mr-2" />
                Weekly Performance
              </button>
              <button
                onClick={() => setActiveTab('finishes')}
                className={`px-6 py-4 font-semibold whitespace-nowrap ${
                  activeTab === 'finishes'
                    ? 'border-b-2 border-royalBlue text-royalBlue'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Medal className="w-5 h-5 inline mr-2" />
                Finishes
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`px-6 py-4 font-semibold whitespace-nowrap ${
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
                {weeklyPerformances.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Fantasy points by week</h4>
                    <PointsByWeekChart weeks={weeklyPerformances} />
                  </div>
                )}
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
                            Week of {formatCalendarDate(week.week_start_date)}
                          </h4>
                          <p className="text-sm text-gray-600">{week.games_played} games played</p>
                          {(finishesByWeek.get(week.week_start_date) || []).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(finishesByWeek.get(week.week_start_date) || [])
                                .slice()
                                .sort((a, b) => finishSortKey(a).localeCompare(finishSortKey(b)))
                                .map((finish) => (
                                  <span
                                    key={finish.slug}
                                    className={`text-xs font-semibold px-2 py-1 rounded-full border ${placementClass(finish.placement)}`}
                                  >
                                    {finish.session ? `${finish.session[0].toUpperCase()}${finish.session.slice(1)}: ` : ''}
                                    {finish.placement ? ordinal(finish.placement) : '-'}
                                    {finish.total_players ? ` of ${finish.total_players}` : ''}
                                  </span>
                                ))}
                            </div>
                          )}
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

            {activeTab === 'finishes' && (
              <div>
                {finishes.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No Titled Tuesday finishes recorded yet.</p>
                ) : (
                  <>
                    <div className="border border-gray-200 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-gray-900 mb-1">Finishing place over time</h4>
                      <FinishPlacesChart finishes={finishes} />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {finishes.length} events
                      {player.tt_event_wins ? ` · ${player.tt_event_wins} won` : ''}
                      {` · ${topTenFinishes} top-10 finishes`}
                    </p>
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                      {visibleFinishes.map((finish) => (
                        <div key={finish.slug} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3">
                          <span
                            className={`min-w-[3.5rem] text-center text-sm font-bold px-2 py-1 rounded-lg border ${placementClass(finish.placement)}`}
                          >
                            {finish.placement ? ordinal(finish.placement) : '-'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900">
                              {finish.event_date ? formatCalendarDate(finish.event_date) : 'Date unknown'}
                              {finish.session && (
                                <span className="ml-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                  {finish.session}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {finish.total_players ? `of ${finish.total_players} players · ` : ''}
                              {finishScore(finish)} · {finish.wins}-{finish.draws}-{finish.losses}
                            </div>
                          </div>
                          {finish.url && (
                            <a
                              href={finish.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-royalBlue"
                              aria-label="View event on Chess.com"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                    {finishes.length > FINISHES_PREVIEW && (
                      <button
                        onClick={() => setShowAllFinishes((value) => !value)}
                        className="mt-4 w-full text-sm font-semibold text-royalBlue hover:text-blue-700"
                      >
                        {showAllFinishes ? 'Show fewer' : `Show all ${finishes.length} events`}
                      </button>
                    )}
                  </>
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
                                {formatCalendarDate(game.date.replace(/\./g, '-'))}
                              </span>
                              <span>
                                Points: <span className="font-semibold">{Number((isWhite ? game.white_points : game.black_points) || 0).toFixed(1)}</span>
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

