import * as React from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League, Team, Lineup, ChessPlayer } from '../types'
import { Crown, Users, Trophy, Calendar, Plus, ExternalLink } from 'lucide-react'
import { fetchLineupPlayerBreakdown } from '../lib/supabase';

function getCurrentTuesday() {
  const now = new Date();
  const day = now.getDay();
  // 2 = Tuesday (0=Sunday, 1=Monday, 2=Tuesday, ...)
  const diff = (day >= 2) ? day - 2 : 6 + day;
  const tuesday = new Date(now);
  tuesday.setDate(now.getDate() - diff);
  return tuesday.toISOString().split('T')[0].replace(/-/g, '.');
}

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [currentLeague, setCurrentLeague] = useState<League | null>(null)
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [currentLineup, setCurrentLineup] = useState<Lineup | null>(null)
  const [lineupPlayers, setLineupPlayers] = useState<ChessPlayer[]>([])
  const [pastLeagues, setPastLeagues] = useState<any[]>([])
  const [futureLeagues, setFutureLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [playerBreakdown, setPlayerBreakdown] = useState<any[]>([])
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [breakdownError, setBreakdownError] = useState('')
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [activeLeagues, setActiveLeagues] = useState<League[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  useEffect(() => {
    async function fetchAvailableWeeks() {
      if (!currentLeague || !user) return;
      // Fetch all weeks from lineups table where user has a lineup with points > 0
      const { data, error } = await supabase
        .from('lineups')
        .select('week_start_date')
        .eq('user_id', user.id)
        .eq('league_id', currentLeague.id)
        .gt('total_points', 0)
        .order('week_start_date', { ascending: true });
      if (error) {
        setAvailableWeeks([]);
        setSelectedWeek(null);
        
        return;
      }
      // Get unique dates
      const uniqueDates = Array.from(new Set((data || []).map(l => l.week_start_date.replace(/-/g, '.'))));
      
      setAvailableWeeks(uniqueDates);
      if (uniqueDates.length > 0) {
        setSelectedWeek(uniqueDates[uniqueDates.length - 1]);
        
      } else {
        setSelectedWeek(null);
        
      }
    }
    fetchAvailableWeeks();
  }, [currentLeague, user]);

  useEffect(() => {
    async function loadBreakdown() {
      if (!user || !currentLeague || !selectedWeek) return;
      setBreakdownLoading(true);
      setBreakdownError('');
      try {
        const data = await fetchLineupPlayerBreakdown(user.id, currentLeague.id, selectedWeek.replace(/\./g, '-'));
        setPlayerBreakdown(data);
      } catch (e: any) {
        setBreakdownError('Could not load point breakdown');
      } finally {
        setBreakdownLoading(false);
      }
    }
    loadBreakdown();
  }, [user, currentLeague, selectedWeek]);

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get all leagues where user is a member
      const { data: allLeagues, error: allLeaguesError } = await supabase
        .from('leagues')
        .select('*')
        .order('start_date', { ascending: true })

      if (allLeaguesError) {
        console.error('Dashboard - all leagues query error:', allLeaguesError)
      }

      // Filter leagues where user is a member
      const leagues = allLeagues?.filter(league => {
        const isMember = league.member_ids && league.member_ids.includes(user.id)
        return isMember
      }) || []

      // Split into active, future, and past leagues
      const todayStr = new Date().toISOString().split('T')[0];
      const active = leagues.filter(l => l.end_date >= todayStr && l.start_date <= todayStr);
      const future = leagues.filter(l => l.start_date > todayStr);
      const past = leagues.filter(l => l.end_date < todayStr);
      setActiveLeagues(active);
      setFutureLeagues(future);

      // Set currentLeague to the first active league (if any)
      setCurrentLeague(active.length > 0 ? active[0] : null);

      // Get user's team for the current league (if any)
      if (active.length > 0) {
        const league = active[0];
        const { data: teams } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', user.id)
          .eq('league_id', league.id)
          .single()
        if (teams) {
          setUserTeam(teams)
          const { data: players } = await supabase
            .from('chess_players')
            .select('*')
            .in('id', teams.player_ids)
          if (players) {
            // setTeamPlayers(players) // This line was removed as per the edit hint
          }
          const currentWeek = getCurrentTuesday()
          const { data: lineups } = await supabase
            .from('lineups')
            .select('*')
            .eq('user_id', user.id)
            .eq('league_id', league.id)
            .eq('week_start_date', currentWeek)
            .single()
          if (lineups) {
            setCurrentLineup(lineups)
            const { data: lineupPlayerData } = await supabase
              .from('chess_players')
              .select('*')
              .in('id', lineups.player_ids)
            if (lineupPlayerData) {
              setLineupPlayers(lineupPlayerData)
            }
          }
        }
      }

      // Get past league performance for all past leagues
      if (past.length > 0) {
        const pastLeagueIds = past.map(l => l.id);
        const { data: pastLeagueData } = await supabase
          .from('leagues')
          .select(`*, lineups!inner(user_id, total_points, week_start_date)`)
          .in('id', pastLeagueIds)
          .order('end_date', { ascending: false })
        if (pastLeagueData) {
          // Process past league data to get standings
          const processedPastLeagues = pastLeagueData.map(league => {
            const userLineups = league.lineups.filter((l: any) => l.user_id === user.id)
            const totalPoints = userLineups.reduce((sum: number, l: any) => sum + l.total_points, 0)
            return {
              league_id: league.id,
              league_name: league.name,
              total_points: totalPoints,
              end_date: league.end_date
            }
          })
          setPastLeagues(processedPastLeagues)
        }
      } else {
        setPastLeagues([])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNextTitledTuesday = () => {
    const now = new Date()
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7
    const nextTuesday = new Date(now)
    nextTuesday.setDate(now.getDate() + daysUntilTuesday)
    return nextTuesday
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-neutral-900">Loading...</div>
      </div>
    )
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
            <h2 className="text-xl lg:text-2xl font-bold mb-4 text-neutral-900">No Active League</h2>
            <p className="text-neutral-700 mb-6 text-sm lg:text-base">
              You're not currently in any active league. Join or create one to start playing!
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
          {/* Current League Info */}
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
                    <p className="font-semibold text-sm lg:text-base text-neutral-900">{currentLeague.buy_in} coins</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-royalBlue" />
                  <div>
                    <p className="text-xs lg:text-sm text-neutral-500">End Date</p>
                    <p className="font-semibold text-sm lg:text-base text-neutral-900">{new Date(currentLeague.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Current Lineup */}
          {userTeam && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
              <h3 className="text-xl font-bold mb-4 text-neutral-900">Current Lineup</h3>
              {currentLineup && lineupPlayers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {lineupPlayers.map((player) => (
                    <div key={player.id} className="bg-neutral-50 rounded-lg p-4 text-center border border-royalBlue">
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
            {breakdownLoading ? (
              <div className="text-neutral-500">Loading breakdown...</div>
            ) : breakdownError ? (
              <div className="text-red-600">{breakdownError}</div>
            ) : playerBreakdown && playerBreakdown.length > 0 ? (
              <table className="min-w-full text-sm text-neutral-900">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 border-b border-royalBlue">Player</th>
                    <th className="text-right px-2 py-1 border-b border-royalBlue">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {playerBreakdown.map((row) => (
                    <tr key={row.player_id || row.player_name} className="border-b border-neutral-100 last:border-b-0">
                      <td className="px-2 py-1 text-neutral-900">{row.player_name}</td>
                      <td className="px-2 py-1 text-right text-neutral-900">{Number(row.player_points).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-royalBlue">
                    <td className="px-2 py-1">TOTAL</td>
                    <td className="px-2 py-1 text-right">{playerBreakdown.reduce((sum, p) => sum + Number(p.player_points), 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
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
          {pastLeagues.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
              <h3 className="text-xl font-bold mb-4 text-neutral-900">Past League Performance</h3>
              <div className="space-y-3">
                {pastLeagues.map((league) => (
                  <div key={league.league_id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-royalBlue">
                    <div>
                      <h4 className="font-semibold text-neutral-900">{league.league_name}</h4>
                      <p className="text-sm text-neutral-500">
                        Ended: {new Date(league.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900">{league.total_points} points</p>
                      <p className="text-sm text-neutral-500">Rank: {league.rank}</p>
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
                    Starts: {new Date(league.start_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Ends: {new Date(league.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Buy-in: {league.buy_in} coins
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
                    Ended: {new Date(league.end_date).toLocaleDateString()}
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
    </div>
  )
}

export default Dashboard 
