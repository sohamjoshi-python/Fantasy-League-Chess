import * as React from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League, Team, Lineup, ChessPlayer } from '../types'
import { Crown, Users, Trophy, Calendar, Plus, ExternalLink } from 'lucide-react'
import { fetchLineupPlayerBreakdownByRounds } from '../lib/supabase'
import PlayerDetailModal from '../components/PlayerDetailModal'

function getCurrentWeekStart() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToSubtract);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [currentLeague, setCurrentLeague] = useState<League | null>(null)
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [currentLineup, setCurrentLineup] = useState<Lineup | null>(null)
  const [lineupPlayers, setLineupPlayers] = useState<ChessPlayer[]>([])
  const [pastLeagues, setPastLeagues] = useState<any[]>([])
  const [futureLeagues, setFutureLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(false)
  const [playerBreakdown, setPlayerBreakdown] = useState<{ 
    early: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }>, 
    late: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> 
  }>({ early: [], late: [] })
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [breakdownError, setBreakdownError] = useState('')
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [activeLeagues, setActiveLeagues] = useState<League[]>([]);
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<ChessPlayer | null>(null);

  // Track if initial load is complete to prevent unnecessary refreshes
  const hasCompletedInitialLoad = React.useRef(false);
  const userIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Only load if user exists and either:
    // 1. We haven't completed initial load, OR
    // 2. The user ID actually changed (different user logged in)
    const userIdChanged = user?.id !== userIdRef.current;
    
    if (user && (!hasCompletedInitialLoad.current || userIdChanged)) {
      if (userIdChanged) {
        // New user, reset the flag
        hasCompletedInitialLoad.current = false;
        userIdRef.current = user.id;
      }
      loadDashboardData();
    } else if (!user) {
      setLoading(false);
      hasCompletedInitialLoad.current = false;
      userIdRef.current = null;
    }
  }, [user]);

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

  const lastLoadedBreakdownKey = React.useRef<string>('');
  
  useEffect(() => {
    async function loadBreakdown() {
      if (!user || !currentLeague || !selectedWeek) {
        return;
      }
      
      // Create a unique key for this breakdown request
      const breakdownKey = `${user.id}-${currentLeague.id}-${selectedWeek}`;
      
      // Skip if we've already loaded this exact breakdown
      if (lastLoadedBreakdownKey.current === breakdownKey) {
        return;
      }
      
      setBreakdownLoading(true);
      setBreakdownError('');
      try {
        const data = await fetchLineupPlayerBreakdownByRounds(user.id, currentLeague.id, selectedWeek.replace(/\./g, '-'));
        setPlayerBreakdown(data);
        lastLoadedBreakdownKey.current = breakdownKey;
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

      // Get all leagues where user is a member with retry logic
      let allLeagues = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        const { data, error } = await supabase
          .from('leagues')
          .select('*')
          .order('start_date', { ascending: true })

        if (error) {
          console.error(`Dashboard - leagues query error (attempt ${retryCount + 1}):`, error)
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            continue;
          }
          throw error;
        }

        allLeagues = data;
        break;
      }

      if (!allLeagues) {
        console.error('Failed to load leagues after all retries');
        hasCompletedInitialLoad.current = true; // Mark as completed even on failure
        return;
      }

      // Filter leagues where user is a member with more robust checking
      const leagues = allLeagues.filter(league => {
        if (!league.member_ids || !Array.isArray(league.member_ids)) {
          console.warn('League has invalid member_ids:', league.id, league.member_ids);
          return false;
        }
        const isMember = league.member_ids.includes(user.id);
        if (!isMember) {
          console.log('User not found in league members:', user.id, league.member_ids);
        }
        return isMember;
      });

      console.log('User leagues found:', leagues.length, 'out of', allLeagues.length);

      // Split into active, future, and past leagues
      const todayStr = new Date().toISOString().split('T')[0];
      const active = leagues.filter(l => l.end_date >= todayStr && l.start_date <= todayStr);
      const future = leagues.filter(l => l.start_date > todayStr);
      const past = leagues.filter(l => l.end_date < todayStr);
      setActiveLeagues(active);
      setFutureLeagues(future);

      // Set currentLeague to the first active league (if any)
      setCurrentLeague(active.length > 0 ? active[0] : null);

      // Get user's team for the current league (if any) with better error handling
      if (active.length > 0) {
        const league = active[0];
        try {
          const { data: teams, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('user_id', user.id)
            .eq('league_id', league.id)
            .maybeSingle(); // Use maybeSingle to handle no results gracefully

          if (teamError) {
            console.error('Error loading team:', teamError);
          } else if (teams) {
            setUserTeam(teams);
            // Load team players if team exists
            if (teams.player_ids && teams.player_ids.length > 0) {
              try {
                const { error: playersError } = await supabase
                  .from('chess_players')
                  .select('*')
                  .in('id', teams.player_ids);
                
                if (playersError) {
                  console.error('Error loading team players:', playersError);
                }
                // Note: setTeamPlayers was removed as per previous edit
              } catch (error) {
                console.error('Exception loading team players:', error);
              }
            }
          }
        } catch (error) {
          console.error('Exception loading team:', error);
        }

        // Load current week lineup
        try {
          const currentWeek = getCurrentWeekStart();
          const { data: lineups, error: lineupError } = await supabase
            .from('lineups')
            .select('*')
            .eq('user_id', user.id)
            .eq('league_id', league.id)
            .eq('week_start_date', currentWeek)
            .maybeSingle();

          if (lineupError) {
            console.error('Error loading lineup:', lineupError);
          } else if (lineups) {
            setCurrentLineup(lineups);
            if (lineups.player_ids && lineups.player_ids.length > 0) {
              try {
                const { data: lineupPlayerData, error: lineupPlayersError } = await supabase
                  .from('chess_players')
                  .select('*')
                  .in('id', lineups.player_ids);
                
                if (lineupPlayersError) {
                  console.error('Error loading lineup players:', lineupPlayersError);
                } else if (lineupPlayerData) {
                  setLineupPlayers(lineupPlayerData);
                }
              } catch (error) {
                console.error('Exception loading lineup players:', error);
              }
            }
          }
        } catch (error) {
          console.error('Exception loading lineup:', error);
        }
      }

      // Get past league performance for all past leagues
      if (past.length > 0) {
        try {
          const pastLeagueIds = past.map(l => l.id);
          
          // Get lineups for past leagues separately to avoid complex join
          const { data: userLineups, error: lineupsError } = await supabase
            .from('lineups')
            .select('league_id, total_points, week_start_date')
            .eq('user_id', user.id)
            .in('league_id', pastLeagueIds);
          
          if (lineupsError) {
            console.error('Error loading past league lineups:', lineupsError);
            setPastLeagues([]);
          } else if (userLineups) {
            // Group lineups by league and calculate totals
            const leagueTotals = new Map<string, number>();
            userLineups.forEach((lineup: any) => {
              const current = leagueTotals.get(lineup.league_id) || 0;
              leagueTotals.set(lineup.league_id, current + (lineup.total_points || 0));
            });
            
            // Process past league data
            const processedPastLeagues = past.map(league => ({
              league_id: league.id,
              league_name: league.name,
              total_points: leagueTotals.get(league.id) || 0,
              end_date: league.end_date
            })).sort((a, b) => b.end_date.localeCompare(a.end_date));
            
            setPastLeagues(processedPastLeagues);
          }
        } catch (error) {
          console.error('Exception loading past leagues:', error);
          setPastLeagues([]);
        }
      } else {
        setPastLeagues([])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
      hasCompletedInitialLoad.current = true; // Mark as completed after load attempt
    }
  }

  const getNextTitledTuesday = () => {
    const now = new Date()
    const daysUntilTuesday = (2 - now.getDay() + 7) % 7
    const nextTuesday = new Date(now)
    nextTuesday.setDate(now.getDate() + daysUntilTuesday)
    return nextTuesday
  }

  if (
    loading &&
    !currentLeague &&
    activeLeagues.length === 0 &&
    futureLeagues.length === 0 &&
    pastLeagues.length === 0
  ) {
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
            {breakdownLoading ? (
              <div className="text-neutral-500">Loading breakdown...</div>
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
                              {row.wins !== undefined && row.total_games !== undefined 
                                ? `${row.wins}/${row.total_games}` 
                                : '-'
                              }
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
                              {row.wins !== undefined && row.total_games !== undefined 
                                ? `${row.wins}/${row.total_games}` 
                                : '-'
                              }
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
