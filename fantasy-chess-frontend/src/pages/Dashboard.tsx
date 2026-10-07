import * as React from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League, Team, Lineup, ChessPlayer } from '../types'
import { Crown, Users, Trophy, Calendar, Plus, ExternalLink } from 'lucide-react'
import { carriedLineupPlayerIds, fetchLineupPlayerBreakdownByRounds, fetchUserLeagueDisplayWeeks, formatTournamentRecord } from '../lib/supabase'
import PlayerDetailModal from '../components/PlayerDetailModal'
import { DashboardPageSkeleton, PointBreakdownSkeleton, SkeletonBlock } from '../components/ui/LoadingSpinner'
import { getLocalDateString, getOpenLineupMonday, getWeekStartMonday } from '../lib/calendarDate'
import { keepIfSame } from '../lib/keepIfSame'
import { formatCalendarDate } from '../lib/leagueStatus'

function getCurrentWeekStart() {
  return getWeekStartMonday();
}

function getTuesdayDateForWeek(weekStartDate: string) {
  const [year, month, day] = weekStartDate.split('-').map(Number)
  const tuesday = new Date(Date.UTC(year, month - 1, day + 1))
  const yyyy = tuesday.getUTCFullYear()
  const mm = String(tuesday.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(tuesday.getUTCDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [currentLeague, setCurrentLeague] = useState<League | null>(null)
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [currentLineup, setCurrentLineup] = useState<Lineup | null>(null)
  const [lineupPlayers, setLineupPlayers] = useState<ChessPlayer[]>([])
  const [editableLineupWeek, setEditableLineupWeek] = useState<string>('')
  const [pastLeagues, setPastLeagues] = useState<any[]>([])
  const [futureLeagues, setFutureLeagues] = useState<League[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [playerBreakdown, setPlayerBreakdown] = useState<{ 
    early: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }>, 
    late: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> 
  }>({ early: [], late: [] })
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [breakdownError, setBreakdownError] = useState('')
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [weeksReady, setWeeksReady] = useState(false);
  const [activeLeagues, setActiveLeagues] = useState<League[]>([]);
  const [selectedActiveLeagueId, setSelectedActiveLeagueId] = useState<string | null>(null);
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<ChessPlayer | null>(null);
  const loadGeneration = React.useRef(0);
  const lastLoadedBreakdownKey = React.useRef('');

  useEffect(() => {
    if (user) {
      const generation = ++loadGeneration.current;
      loadDashboardData(undefined, generation);
    } else {
      setInitialLoading(false);
    }
  }, [user?.id]);

  const loadDashboardDataRef = React.useRef<(preferred?: string | null, generation?: number) => void>(() => {})
  const refreshExtrasRef = React.useRef<() => void>(() => {})
  const weeksLeagueIdRef = React.useRef<string | null>(null)

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      loadDashboardDataRef.current()
      refreshExtrasRef.current()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const refreshWeeks = async (background: boolean) => {
    if (!currentLeague || !user) {
      setWeeksReady(true)
      return
    }
    if (!background) setWeeksReady(false)
    try {
      const displayWeeks = await fetchUserLeagueDisplayWeeks(user.id, currentLeague)
      setAvailableWeeks(keepIfSame(displayWeeks))
      setSelectedWeek((prev) => {
        if (prev && displayWeeks.includes(prev)) return prev
        return displayWeeks.length > 0 ? displayWeeks[displayWeeks.length - 1] : null
      })
    } catch (e) {
      if (!background) {
        setAvailableWeeks([])
        setSelectedWeek(null)
      }
    } finally {
      setWeeksReady(true)
    }
  }

  const refreshBreakdown = async (background: boolean) => {
    if (!user || !currentLeague || !selectedWeek) return
    const breakdownKey = `${user.id}-${currentLeague.id}-${selectedWeek}`
    if (!background && lastLoadedBreakdownKey.current === breakdownKey) return
    if (!background) {
      setBreakdownLoading(true)
      setBreakdownError('')
    }
    try {
      const data = await fetchLineupPlayerBreakdownByRounds(user.id, currentLeague.id, selectedWeek.replace(/\./g, '-'))
      setPlayerBreakdown(keepIfSame(data))
      lastLoadedBreakdownKey.current = breakdownKey
    } catch (e: any) {
      if (!background) setBreakdownError('Could not load point breakdown')
    } finally {
      if (!background) setBreakdownLoading(false)
    }
  }

  refreshExtrasRef.current = () => {
    void refreshWeeks(true)
    void refreshBreakdown(true)
  }

  useEffect(() => {
    const sameLeague = weeksLeagueIdRef.current === (currentLeague?.id ?? null)
    weeksLeagueIdRef.current = currentLeague?.id ?? null
    void refreshWeeks(sameLeague && availableWeeks.length > 0)
  }, [currentLeague?.id, user?.id]);

  useEffect(() => {
    void refreshBreakdown(false)
  }, [currentLeague?.id, user?.id, selectedWeek]);

  const loadDashboardData = async (preferredActiveLeagueId?: string | null, generation?: number) => {
    if (!user) return

    const capturedGeneration = generation ?? loadGeneration.current
    const isCurrent = () => capturedGeneration === loadGeneration.current

    const applyPastLeagues = (
      past: Array<{ id: string; name: string; end_date: string }>,
      result: { data: Array<{ league_id: string; total_points: number | null }> | null; error: { message?: string } | null }
    ) => {
      if (past.length === 0) {
        setPastLeagues(keepIfSame<any[]>([]))
        return
      }
      if (result.error) {
        console.error('Error loading past league lineups:', result.error)
        setPastLeagues(keepIfSame<any[]>([]))
        return
      }
      const leagueTotals = new Map<string, number>()
      ;(result.data || []).forEach((lineup) => {
        const current = leagueTotals.get(lineup.league_id) || 0
        leagueTotals.set(lineup.league_id, current + (lineup.total_points || 0))
      })
      setPastLeagues(keepIfSame(past.map(league => ({
        league_id: league.id,
        league_name: league.name,
        total_points: leagueTotals.get(league.id) || 0,
        end_date: league.end_date
      })).sort((a, b) => b.end_date.localeCompare(a.end_date))))
    }

    try {
      const currentWeek = getCurrentWeekStart()
      const gamesImportedPromise = hasImportedGamesForWeek(currentWeek)

      // Get all leagues where user is a member with retry logic
      let allLeagues = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        const { data, error } = await supabase
          .from('leagues')
          .select('*')
          .contains('member_ids', [user.id])
          .order('start_date', { ascending: true })

        if (error) {
          console.error(`Dashboard - leagues query error (attempt ${retryCount + 1}):`, error)
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 250 * retryCount));
            continue;
          }
          throw error;
        }

        allLeagues = data;
        break;
      }

      if (!isCurrent()) return

      if (!allLeagues) {
        console.error('Failed to load leagues after all retries');
        return;
      }

      const leagues = (allLeagues || []).filter(
        (league) => league.member_ids && Array.isArray(league.member_ids)
      );

      // Split into active, future, and past leagues (use local calendar dates; DB stores YYYY-MM-DD)
      const todayStr = getLocalDateString();
      const active = leagues.filter(l => l.end_date >= todayStr && l.start_date <= todayStr);
      const future = leagues.filter(l => l.start_date > todayStr);
      const past = leagues.filter(l => l.end_date < todayStr);
      setActiveLeagues(keepIfSame(active));
      setFutureLeagues(keepIfSame(future));

      const pickId = preferredActiveLeagueId ?? selectedActiveLeagueId;
      const activeLeague =
        active.find((l) => l.id === pickId) || active[0] || null;
      if (activeLeague) {
        setSelectedActiveLeagueId((prev) => prev === activeLeague.id ? prev : activeLeague.id);
      } else {
        setSelectedActiveLeagueId(null);
        setUserTeam(keepIfSame<Team | null>(null));
        setCurrentLineup(keepIfSame<Lineup | null>(null));
        setLineupPlayers(keepIfSame<ChessPlayer[]>([]));
      }
      setCurrentLeague(keepIfSame(activeLeague));
      if (generation !== undefined && generation === loadGeneration.current) {
        setInitialLoading(false)
      }

      const gamesImported = await gamesImportedPromise
      if (!isCurrent()) return
      const lineupWeek = activeLeague
        ? getOpenLineupMonday(activeLeague.start_date, activeLeague.end_date, currentWeek, gamesImported)
        : currentWeek
      setEditableLineupWeek((prev) => prev === lineupWeek ? prev : lineupWeek)

      const pastLineupsPromise = past.length > 0
        ? supabase
            .from('lineups')
            .select('league_id, total_points')
            .eq('user_id', user.id)
            .in('league_id', past.map(l => l.id))
        : Promise.resolve({ data: null, error: null })

      if (activeLeague) {
        if (generation !== undefined) setRosterLoading(true)
        const league = activeLeague
        const [teamResult, lineupResult, priorLineupsResult, pastLineupsResult] = await Promise.all([
          supabase
            .from('teams')
            .select('*')
            .eq('user_id', user.id)
            .eq('league_id', league.id)
            .maybeSingle(),
          supabase
            .from('lineups')
            .select('*')
            .eq('user_id', user.id)
            .eq('league_id', league.id)
            .eq('week_start_date', lineupWeek)
            .maybeSingle(),
          supabase
            .from('lineups')
            .select('week_start_date, player_ids')
            .eq('user_id', user.id)
            .eq('league_id', league.id)
            .lt('week_start_date', lineupWeek)
            .order('week_start_date', { ascending: false })
            .limit(12),
          pastLineupsPromise,
        ])

        if (!isCurrent()) return

        const teamPlayerIds = new Set<string>(teamResult.data?.player_ids || [])
        if (teamResult.error) {
          console.error('Error loading team:', teamResult.error)
        }
        setUserTeam(keepIfSame(teamResult.data ?? null))

        let lineupToDisplay = lineupResult.data
        if (lineupResult.error) {
          console.error('Error loading lineup:', lineupResult.error)
        } else if (!lineupToDisplay) {
          if (priorLineupsResult.error) {
            console.error('Error loading previous lineup:', priorLineupsResult.error)
          } else {
            const carriedIds = carriedLineupPlayerIds(priorLineupsResult.data || [], lineupWeek, teamPlayerIds)
            if (carriedIds.length > 0) {
              lineupToDisplay = {
                id: '',
                user_id: user.id,
                league_id: league.id,
                week_start_date: lineupWeek,
                player_ids: carriedIds,
                total_points: 0,
              }
            }
          }
        }

        if (lineupToDisplay && !lineupResult.error) {
          const currentTeamLineupIds = (lineupToDisplay.player_ids || []).filter((id: string) =>
            teamPlayerIds.has(id)
          )
          setCurrentLineup(keepIfSame({
            ...lineupToDisplay,
            player_ids: currentTeamLineupIds,
          }))
          if (currentTeamLineupIds.length > 0) {
            const { data: lineupPlayerData, error: lineupPlayersError } = await supabase
              .from('chess_players')
              .select('*')
              .in('id', currentTeamLineupIds)
            if (!isCurrent()) return
            if (lineupPlayersError) {
              console.error('Error loading lineup players:', lineupPlayersError)
            } else if (lineupPlayerData) {
              setLineupPlayers(keepIfSame(lineupPlayerData))
            }
          } else {
            setLineupPlayers(keepIfSame<ChessPlayer[]>([]))
          }
        } else if (!lineupResult.error) {
          setCurrentLineup(keepIfSame<Lineup | null>(null))
          setLineupPlayers(keepIfSame<ChessPlayer[]>([]))
        }

        applyPastLeagues(past, pastLineupsResult)
      } else {
        const pastLineupsResult = await pastLineupsPromise
        if (!isCurrent()) return
        applyPastLeagues(past, pastLineupsResult)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      if (generation !== undefined && generation === loadGeneration.current) {
        setRosterLoading(false)
        setInitialLoading(false)
      }
    }
  }

  loadDashboardDataRef.current = loadDashboardData

  const hasImportedGamesForWeek = async (weekStartDate: string) => {
    const gameDate = getTuesdayDateForWeek(weekStartDate)
    const { count, error } = await supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('date', gameDate)

    if (error) {
      console.error('Error checking imported games for dashboard lineup:', error)
      return false
    }

    return (count || 0) > 0
  }

  const getNextTitledTuesday = () => {
    const now = new Date()
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7
    const nextTuesday = new Date(now)
    nextTuesday.setDate(now.getDate() + daysUntilTuesday)
    return nextTuesday
  }

  if (initialLoading) {
    return <DashboardPageSkeleton />
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white min-h-screen pt-24">
      <h1 className="text-4xl lg:text-5xl font-extrabold text-neutral-900 mb-8 text-center tracking-tight font-serif drop-shadow relative">
        Dashboard
        <span className="block w-16 h-1 bg-royalBlue rounded-full mx-auto mt-3"></span>
      </h1>
      
      {activeLeagues.length === 0 ? (
        <div className="text-center py-12 lg:py-16">
          <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8 max-w-md mx-auto border-2 border-royalBlue">
            <Crown className="h-12 w-12 lg:h-16 lg:w-16 text-royalBlue mx-auto mb-4" />
            <h2 className="text-xl lg:text-2xl font-bold mb-4 text-neutral-900">
              {futureLeagues.length > 0 ? 'No League In Progress' : 'No Active League'}
            </h2>
            <p className="text-neutral-700 mb-6 text-sm lg:text-base">
              {futureLeagues.length > 0
                ? 'Your upcoming leagues are listed below. You can open one anytime to prep for the draft.'
                : "You're not currently in any active league. Join or create one to start playing!"}
            </p>
            <Link
              to="/join-league"
              className="inline-flex items-center space-x-2 bg-[#1e293b] hover:bg-royalBlue text-white px-4 lg:px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>Join a League</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6 lg:space-y-8">
          {activeLeagues.length > 1 && (
            <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-royalBlue">
              <label htmlFor="active-league-select" className="block text-sm font-medium text-neutral-700 mb-2">
                Active league
              </label>
              <select
                id="active-league-select"
                className="w-full border border-royalBlue rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-royalBlue"
                value={selectedActiveLeagueId || currentLeague?.id || ''}
                onChange={(e) => loadDashboardData(e.target.value)}
              >
                {activeLeagues.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}
          {currentLeague && (
            <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-royalBlue">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                <h2 className="text-xl lg:text-2xl font-bold text-neutral-900 mb-2 lg:mb-0">{currentLeague.name}</h2>
                <Link
                  to={`/league/${currentLeague.id}`}
                  className="text-royalBlue hover:text-purple font-medium text-sm lg:text-base transition-colors"
                >
                  View League →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 lg:h-6 lg:w-6 text-royalBlue" />
                  <div>
                    <p className="text-xs lg:text-sm text-neutral-500">Members</p>
                    <p className="font-semibold text-sm lg:text-base text-neutral-900">{currentLeague.member_ids.length}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Trophy className="h-5 w-5 lg:h-6 lg:w-6 text-royalBlue" />
                  <div>
                    <p className="text-xs lg:text-sm text-neutral-500">Buy-in</p>
                    <p className="font-semibold text-sm lg:text-base text-neutral-900">{currentLeague.buy_in} gems</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-royalBlue" />
                  <div>
                    <p className="text-xs lg:text-sm text-neutral-500">End Date</p>
                    <p className="font-semibold text-sm lg:text-base text-neutral-900">{formatCalendarDate(currentLeague.end_date)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Current Lineup */}
          {(userTeam || rosterLoading) && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-neutral-900">Current Lineup</h3>
                {editableLineupWeek && (
                  <p className="text-xs text-neutral-500">
                    Applies to week of {formatCalendarDate(editableLineupWeek)}
                  </p>
                )}
              </div>
              {rosterLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonBlock key={i} className="h-16" />
                  ))}
                </div>
              ) : currentLineup && lineupPlayers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {lineupPlayers.map((player) => (
                    <div 
                      key={player.id} 
                      onClick={() => setSelectedPlayerForModal(player)}
                      className="bg-neutral-50 rounded-lg p-4 text-center border border-royalBlue cursor-pointer hover:border-blue-700 hover:shadow-lg transition-all"
                    >
                      <h4 className="font-semibold text-sm text-neutral-900">{player.name}</h4>
                      <p className="text-xs text-neutral-500">ELO: {player.elo}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <p className="mb-4">No lineup set for this week</p>
                  {currentLeague && (
                    <Link
                      to={`/league/${currentLeague.id}`}
                      className="bg-[#1e293b] hover:bg-royalBlue text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
                    >
                      Set Lineup
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Point Breakdown Table */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
            <div className="mb-2 flex items-center space-x-2">
              <h3 className="text-xl font-bold text-neutral-900">Point Breakdown</h3>
              {availableWeeks.length > 0 && (
                <select
                  className="ml-2 border border-royalBlue rounded px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-royalBlue"
                  value={selectedWeek || ''}
                  onChange={e => setSelectedWeek(e.target.value)}
                >
                  {availableWeeks.map(week => (
                    <option key={week} value={week}>{week}</option>
                  ))}
                </select>
              )}
              <span className="text-xs text-neutral-500">(Select week)</span>
            </div>
            {((!weeksReady || breakdownLoading) && playerBreakdown.early.length === 0 && playerBreakdown.late.length === 0) ? (
              <PointBreakdownSkeleton />
            ) : breakdownError ? (
              <div className="text-red-600">{breakdownError}</div>
            ) : (playerBreakdown.early.length > 0 || playerBreakdown.late.length > 0) ? (
              <div className="space-y-6">
                {/* Early Round */}
                {playerBreakdown.early.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3 text-neutral-900">Early Round</h4>
                    <table className="min-w-full text-sm text-neutral-900">
                      <thead>
                        <tr>
                          <th className="text-left px-2 py-1 border-b border-royalBlue">Player</th>
                          <th className="text-center px-2 py-1 border-b border-royalBlue">Record</th>
                          <th className="text-right px-2 py-1 border-b border-royalBlue">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerBreakdown.early.map((row) => (
                          <tr key={row.player_id || row.player_name} className="border-b border-neutral-100 last:border-b-0">
                            <td className="px-2 py-1 text-neutral-900">{row.player_name}</td>
                            <td className="px-2 py-1 text-center text-neutral-900">
                              {formatTournamentRecord(row.wins, row.total_games)}
                            </td>
                            <td className="px-2 py-1 text-right text-neutral-900">{Number(row.player_points).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-royalBlue">
                          <td className="px-2 py-1">TOTAL</td>
                          <td className="px-2 py-1 text-center">-</td>
                          <td className="px-2 py-1 text-right">{playerBreakdown.early.reduce((sum, p) => sum + Number(p.player_points), 0).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Late Round */}
                {playerBreakdown.late.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3 text-neutral-900">Late Round</h4>
                    <table className="min-w-full text-sm text-neutral-900">
                      <thead>
                        <tr>
                          <th className="text-left px-2 py-1 border-b border-royalBlue">Player</th>
                          <th className="text-center px-2 py-1 border-b border-royalBlue">Record</th>
                          <th className="text-right px-2 py-1 border-b border-royalBlue">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerBreakdown.late.map((row) => (
                          <tr key={row.player_id || row.player_name} className="border-b border-neutral-100 last:border-b-0">
                            <td className="px-2 py-1 text-neutral-900">{row.player_name}</td>
                            <td className="px-2 py-1 text-center text-neutral-900">
                              {formatTournamentRecord(row.wins, row.total_games)}
                            </td>
                            <td className="px-2 py-1 text-right text-neutral-900">{Number(row.player_points).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-royalBlue">
                          <td className="px-2 py-1">TOTAL</td>
                          <td className="px-2 py-1 text-center">-</td>
                          <td className="px-2 py-1 text-right">{playerBreakdown.late.reduce((sum, p) => sum + Number(p.player_points), 0).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Combined Total */}
                <div className="bg-neutral-50 rounded-lg p-4 border border-royalBlue">
                  <h4 className="text-lg font-semibold mb-2 text-neutral-900">Week Total</h4>
                  <p className="text-2xl font-bold text-royalBlue">
                    {(playerBreakdown.early.reduce((sum, p) => sum + Number(p.player_points), 0) + 
                      playerBreakdown.late.reduce((sum, p) => sum + Number(p.player_points), 0)).toFixed(2)} points
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-neutral-500">No breakdown available for this week.</div>
            )}
          </div>
          {/* Next Titled Tuesday */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
            <h3 className="text-xl font-bold mb-4 text-neutral-900">Next Titled Tuesday</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-neutral-900">
                  {getNextTitledTuesday().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-neutral-500">Make sure your lineup is set before the tournament starts!</p>
              </div>
              <a
                href="https://www.chess.com/tournament/live/titled-tuesdays"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-[#1e293b] hover:bg-royalBlue text-white px-4 py-2 rounded-lg transition-colors shadow-lg"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Watch Live</span>
              </a>
            </div>
          </div>

          {/* Past Performance */}
          {false && pastLeagues.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
              <h3 className="text-xl font-bold mb-4 text-neutral-900">Past League Performance</h3>
              <div className="space-y-3">
                {pastLeagues.map((league) => (
                  <div key={league.league_id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-royalBlue">
                    <div>
                      <h4 className="font-semibold text-neutral-900">{league.league_name}</h4>
                      <p className="text-sm text-neutral-500">
                        Ended: {formatCalendarDate(league.end_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900">{league.total_points} points</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Future Leagues Section */}
      {futureLeagues.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8 border-2 border-royalBlue">
          <h2 className="text-xl font-bold mb-4 text-neutral-900">Upcoming Leagues</h2>
          <div className="space-y-3">
            {futureLeagues.map((league) => (
              <div key={league.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-royalBlue">
                <div>
                  <h4 className="font-semibold text-neutral-900">{league.name}</h4>
                  <p className="text-sm text-neutral-500">
                    Starts: {formatCalendarDate(league.start_date)}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Ends: {formatCalendarDate(league.end_date)}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Buy-in: {league.buy_in} gems
                  </p>
                </div>
                <Link
                  to={`/league/${league.id}`}
                  className="bg-[#1e293b] hover:bg-royalBlue text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg"
                >
                  View League
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Leagues Section */}
      {pastLeagues.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8 border-2 border-royalBlue">
          <h2 className="text-xl font-bold mb-4 text-neutral-900">Past Leagues</h2>
          <div className="space-y-3">
            {pastLeagues.map((league) => (
              <div key={league.league_id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-royalBlue">
                <div>
                  <h4 className="font-semibold text-neutral-900">{league.league_name}</h4>
                  <p className="text-sm text-neutral-500">
                    Ended: {formatCalendarDate(league.end_date)}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Your Points: {league.total_points}
                  </p>
                </div>
                <Link
                  to={`/league/${league.league_id}`}
                  className="bg-[#1e293b] hover:bg-royalBlue text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg"
                >
                  View League
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Detail Modal */}
      {selectedPlayerForModal && (
        <PlayerDetailModal
          player={selectedPlayerForModal}
          onClose={() => setSelectedPlayerForModal(null)}
        />
      )}
    </div>
  )
}

export default Dashboard 
