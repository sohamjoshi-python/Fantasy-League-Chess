import * as React from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League, Team, Lineup, ChessPlayer } from '../types'
import { Crown, Trophy, Calendar, Edit, Check, X, RefreshCw } from 'lucide-react'
import { fetchLineupPlayerBreakdown } from '../lib/supabase';

const LeaguePage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>()
  const { user } = useAuth()
  const [league, setLeague] = useState<League | null>(null)
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<ChessPlayer[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<ChessPlayer[]>([])
  const [currentLineup, setCurrentLineup] = useState<Lineup | null>(null)
  const [lineupPlayers, setLineupPlayers] = useState<ChessPlayer[]>([])
  const [standings, setStandings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Lineup editing state
  const [isEditingLineup, setIsEditingLineup] = useState(false)
  const [selectedLineupPlayers, setSelectedLineupPlayers] = useState<string[]>([])

  // Helper: is current user the league owner?
  const isOwner = user && league && user.id === league.creator_id
  // Helper: is draft started?
  const draftStarted = !!league?.draft_started
  // Helper: is it before league start date?
  const beforeStartDate = league && new Date() < new Date(league.start_date)

  const [userMap, setUserMap] = useState<{ [id: string]: string }>({})
  const [search, setSearch] = useState('')

  // User popup state
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showUserPopup, setShowUserPopup] = useState(false)
  const [selectedUserTeam, setSelectedUserTeam] = useState<ChessPlayer[]>([])
  const [selectedUserLineup, setSelectedUserLineup] = useState<ChessPlayer[]>([])

  const [playerBreakdown, setPlayerBreakdown] = useState<any[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [payout, setPayout] = useState<any | null>(null);
  const [winnerName, setWinnerName] = useState<string>('');

  useEffect(() => {
    async function fetchAvailableWeeks() {
      if (!league || !user) return;
      // Fetch all weeks from lineups table where user has a lineup with points > 0
      const { data, error } = await supabase
        .from('lineups')
        .select('week_start_date')
        .eq('user_id', user.id)
        .eq('league_id', league.id)
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
  }, [league, user]);

  useEffect(() => {
    async function loadBreakdown() {
      if (!user || !league || !selectedWeek) return;
      setBreakdownLoading(true);
      setBreakdownError('');
      try {
        const data = await fetchLineupPlayerBreakdown(user.id, league.id, selectedWeek.replace(/\./g, '-'));
        setPlayerBreakdown(data);
      } catch (e: any) {
        setBreakdownError('Could not load point breakdown');
      } finally {
        setBreakdownLoading(false);
      }
    }
    loadBreakdown();
  }, [user, league, selectedWeek]);

  useEffect(() => {
    async function maybeProcessPayout() {
      if (
        league &&
        new Date(league.end_date) < new Date() &&
        !league.payout_processed
      ) {
        // Call the payout function
        await supabase.rpc('process_league_payouts');
        // Optionally, reload league data to reflect payout_processed
        // You may want to call loadLeagueData() here
      }
    }
    maybeProcessPayout();
  }, [league]);

  useEffect(() => {
    if (leagueId && user) {
      loadLeagueData()
    }
  }, [leagueId, user])

  const loadLeagueData = async () => {
    if (!leagueId || !user) return

    try {
      setLoading(true)

      // Get league data
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single()

      if (leagueError || !leagueData) {
        console.error('loadLeagueData - league error:', leagueError)
        setError('League not found')
        return
      }

      setLeague(leagueData)
      // Combine all relevant user IDs
      const allUserIds = Array.from(new Set([
        ...(leagueData.member_ids || []),
        ...(leagueData.draft_order || [])
      ]));
      fetchUserMap(allUserIds)

      // Get user's team
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .single()

      if (teamData) {
        setUserTeam(teamData)

        // Get team players
        const { data: players } = await supabase
          .from('chess_players')
          .select('*')
          .in('id', teamData.player_ids)

        if (players) {
          setTeamPlayers(players)
        }
      }

      // Get available players for draft
      if (!leagueData.draft_completed) {
        const { data: allPlayers } = await supabase
          .from('chess_players')
          .select('*')
          .order('elo', { ascending: false })

        if (allPlayers) {
          // Filter out already drafted players
          const draftedPlayerIds = new Set()
          const { data: allTeams } = await supabase
            .from('teams')
            .select('player_ids')
            .eq('league_id', leagueId)

          if (allTeams) {
            allTeams.forEach(team => {
              team.player_ids.forEach((id: string) => draftedPlayerIds.add(id))
            })
          }

          const available = allPlayers.filter(player => !draftedPlayerIds.has(player.id))
          setAvailablePlayers(available)
        }
      }

      // Get current lineup
      const currentWeek = getCurrentWeekStart()
      const { data: lineupData } = await supabase
        .from('lineups')
        .select('*')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .eq('week_start_date', currentWeek)
        .single()

      if (lineupData) {
        setCurrentLineup(lineupData)
        setSelectedLineupPlayers(lineupData.player_ids)

        // Get lineup players
        const { data: lineupPlayerData } = await supabase
          .from('chess_players')
          .select('*')
          .in('id', lineupData.player_ids)

        if (lineupPlayerData) {
          setLineupPlayers(lineupPlayerData)
        }
      }

      // Load standings
      await loadStandings(leagueId)



    } catch (error) {
      console.error('Error loading league data:', error)
      setError('Failed to load league data')
    } finally {
      setLoading(false)
    }
  }

  const loadStandings = async (leagueId: string) => {
    try {
      // Get all league members first
      const { data: members } = await supabase
        .from('league_members')
        .select('user_id, display_name, email')
        .eq('league_id', leagueId)

      if (!members) return

      // Get lineups to calculate points
      const { data: lineups } = await supabase
        .from('lineups')
        .select('*')
        .eq('league_id', leagueId)

      // Calculate total points for each user
      const userPoints = new Map<string, number>()
      if (lineups) {
        lineups.forEach(lineup => {
          const current = userPoints.get(lineup.user_id) || 0
          userPoints.set(lineup.user_id, current + lineup.total_points)
        })
      }

      // Create standings data for all members
      const standingsData = members.map(member => ({
        user_id: member.user_id,
        user_email: member.email,
        display_name: member.display_name,
        total_points: userPoints.get(member.user_id) || 0,
        rank: 0
      }))

      // Sort by points and assign ranks
      standingsData.sort((a, b) => b.total_points - a.total_points)
      standingsData.forEach((standing, index) => {
        standing.rank = index + 1
      })

      setStandings(standingsData)
    } catch (error) {
      console.error('Error loading standings:', error)
    }
  }

  const getCurrentWeekStart = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysToSubtract)
    return monday.toISOString().split('T')[0]
  }

  const isUserTurn = () => {
    if (!league || !user) return false
    return league.draft_order[league.current_draft_turn] === user.id
  }

  const draftPlayer = async (playerId: string) => {
    if (!league || !user || !isUserTurn()) return
    try {
      setLoading(true)
      
      // Ensure team exists
      let team = userTeam
      if (!team) {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({ user_id: user.id, league_id: league.id, player_ids: [] })
          .select()
          .single()
        if (teamError) throw teamError
        team = newTeam
        setUserTeam(newTeam)
      }
      
      // Add player to user's team
      const newPlayerIds = [...(team!.player_ids || []), playerId]
      const { error: teamUpdateError } = await supabase
        .from('teams')
        .update({ player_ids: newPlayerIds })
        .eq('id', team!.id)
      if (teamUpdateError) throw teamUpdateError
      
      // Update league draft state
      const newDraftTurn = league.current_draft_turn + 1
      const isDraftComplete = newDraftTurn >= league.member_ids.length * 10
      const { error: leagueError } = await supabase
        .from('leagues')
        .update({ current_draft_turn: newDraftTurn, draft_completed: isDraftComplete })
        .eq('id', league.id)
      if (leagueError) throw leagueError
      

      
      await loadLeagueData()
    } catch (error: any) {
      setError(error.message || 'Failed to draft player')
    } finally {
      setLoading(false)
    }
  }

  const saveLineup = async () => {
    if (!league || !user || selectedLineupPlayers.length !== 5) return

    try {
      setLoading(true)

      const currentWeek = getCurrentWeekStart()
      const { error } = await supabase
        .from('lineups')
        .upsert({
          user_id: user.id,
          league_id: league.id,
          week_start_date: currentWeek,
          player_ids: selectedLineupPlayers,
          total_points: 0
        })

      if (error) throw error

      setIsEditingLineup(false)
      await loadLeagueData()
    } catch (error) {
      console.error('Error saving lineup:', error)
      setError('Failed to save lineup')
    } finally {
      setLoading(false)
    }
  }

  // Helper to generate snake draft order
  function generateSnakeDraftOrder(memberIds: string[], rounds = 10) {
    const order: string[] = [];
    for (let round = 0; round < rounds; round++) {
      if (round % 2 === 0) {
        order.push(...memberIds);
      } else {
        order.push(...[...memberIds].reverse());
      }
    }
    return order;
  }

  // Fix draft order if it's incorrect
  const fixDraftOrder = async () => {
    if (!league) return
    try {
      const fullDraftOrder = generateSnakeDraftOrder(league.member_ids, 10)
      await supabase.from('leagues').update({ 
        draft_order: fullDraftOrder,
        current_draft_turn: 0
      }).eq('id', league.id)
      await loadLeagueData()
    } catch (err) {
      console.error('Failed to fix draft order:', err)
    }
  }

  // Add current user to league if not already a member
  const addUserToLeague = async () => {
    if (!league || !user) {
      console.error('addUserToLeague - missing league or user:', { league: !!league, user: !!user })
      return
    }
    
    try {
      setLoading(true)
      
      // Check if user is already a member
      if (league.member_ids && league.member_ids.includes(user.id)) {
        return
      }
      
      // Get user's display name from Auth metadata
      let displayName = user.email || user.id.slice(0, 6);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.user_metadata?.display_name) {
          displayName = authUser.user_metadata.display_name;
        } else if (authUser?.user_metadata?.full_name) {
          displayName = authUser.user_metadata.full_name;
        }
      } catch (err) {
        
      }
      
      const updatedMemberIds = [...(league.member_ids || []), user.id]
      const updatedDraftOrder = generateSnakeDraftOrder(updatedMemberIds, 10)
      

      
      // Add user to league_members table first
      const { error: memberError } = await supabase
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: user.id,
          display_name: displayName,
          email: user.email
        })
        .single()
      
      if (memberError) {
        console.error('Error adding user to league_members:', memberError)
        // Continue anyway - the league update might still work
      }
      
      // Update the league with new member and draft order
      const { error } = await supabase.from('leagues').update({ 
        member_ids: updatedMemberIds,
        draft_order: updatedDraftOrder,
        current_draft_turn: 0
      }).eq('id', league.id)
      
      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }
      

      
      // Update local state immediately
      if (league) {
        const updatedLeague = {
          ...league,
          member_ids: updatedMemberIds,
          draft_order: updatedDraftOrder,
          current_draft_turn: 0
        }
        setLeague(updatedLeague)
        fetchUserMap(updatedMemberIds)
      }
      

      

      
    } catch (err) {
      console.error('Failed to add user to league:', err)
      setError('Failed to add user to league')
    } finally {
      setLoading(false)
    }
  }

  // Manual draft start handler
  const handleStartDraft = async () => {
    if (!league) return
    setLoading(true)
    try {
      // Generate full snake draft order
      const fullDraftOrder = generateSnakeDraftOrder(league.member_ids, 10)
      await supabase.from('leagues').update({ 
        draft_started: true, 
        draft_start_time: new Date().toISOString(),
        draft_order: fullDraftOrder,
        current_draft_turn: 0
      }).eq('id', league.id)
      await loadLeagueData()
    } catch (err) {
      setError('Failed to start draft')
    } finally {
      setLoading(false)
    }
  }

  // Manual reload button
  const handleReload = () => {
    loadLeagueData()
  }

  // Handle user click in standings
  const handleUserClick = async (userData: any) => {
    try {
      setSelectedUser(userData)
      setShowUserPopup(true)

      // Get user's team
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', userData.user_id)
        .eq('league_id', leagueId!)
        .single()

      if (teamData) {
        const { data: teamPlayers } = await supabase
          .from('chess_players')
          .select('*')
          .in('id', teamData.player_ids)

        setSelectedUserTeam(teamPlayers || [])
      } else {
        setSelectedUserTeam([])
      }

      // Get user's current lineup
      const currentWeek = getCurrentWeekStart()
      const { data: lineupData } = await supabase
        .from('lineups')
        .select('*')
        .eq('user_id', userData.user_id)
        .eq('league_id', leagueId!)
        .eq('week_start_date', currentWeek)
        .single()

      if (lineupData) {
        const { data: lineupPlayers } = await supabase
          .from('chess_players')
          .select('*')
          .in('id', lineupData.player_ids)

        setSelectedUserLineup(lineupPlayers || [])
      } else {
        setSelectedUserLineup([])
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }



  // Fetch all league member display names from league_members table
  const fetchUserMap = async (ids: string[]) => {
    if (!ids.length || !leagueId) return;
    
    
    
    
    try {
      const { data: members, error } = await supabase
        .from('league_members')
        .select('user_id, display_name, email')
        .eq('league_id', leagueId)
        .in('user_id', ids);
      
      
      
      
      
      if (members && !error && members.length > 0) {
        const map: { [id: string]: string } = {};
        members.forEach((member) => {
          // Use display_name if available and not empty, otherwise use email, otherwise use truncated ID
          const displayName = member.display_name && member.display_name.trim() !== '' 
            ? member.display_name 
            : member.email || member.user_id.slice(0, 6);
          map[member.user_id] = displayName;
        });
        
        setUserMap(map);
      } else {
        
        // Fallback: create a simple map with user IDs
        const fallbackMap: { [id: string]: string } = {};
        ids.forEach(id => {
          fallbackMap[id] = id.slice(0, 6);
        });
        
        setUserMap(fallbackMap);
      }
    } catch (err) {
      console.error('Error in fetchUserMap:', err);
      // Fallback: create a simple map with user IDs
      const fallbackMap: { [id: string]: string } = {};
      ids.forEach(id => {
        fallbackMap[id] = id.slice(0, 6);
      });
      
      setUserMap(fallbackMap);
    }
  };

  // Fetch payout and winner info if league ended and payout processed
  useEffect(() => {
    async function fetchPayoutAndWinner() {
      if (
        league &&
        new Date(league.end_date) < new Date() &&
        league.payout_processed
      ) {
        const { data: payoutData } = await supabase
          .from('payouts')
          .select('user_id, amount, processed_at')
          .eq('league_id', league.id)
          .single();
        setPayout(payoutData);
        if (payoutData) {
          // Try to get display name from userMap or fallback to user_id
          let displayName = '';
          if (userMap[payoutData.user_id]) {
            displayName = userMap[payoutData.user_id];
          } else {
            // Fetch from league_members
            const { data: member } = await supabase
              .from('league_members')
              .select('display_name')
              .eq('league_id', league.id)
              .eq('user_id', payoutData.user_id)
              .single();
            displayName = member?.display_name || payoutData.user_id;
          }
          setWinnerName(displayName);
        }
      } else {
        setPayout(null);
        setWinnerName('');
      }
    }
    fetchPayoutAndWinner();
  }, [league, userMap]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (error || !league) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-xl">{error || 'League not found'}</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white min-h-screen p-4 lg:p-6">
      {/* League Header */}
      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 mb-6 lg:mb-8 border-2 border-gold">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2 lg:mb-0">{league.name}</h1>
            {new Date(league.end_date) < new Date() && (
              <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-bold">
                League Ended
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button type="button" onClick={handleReload} className="flex items-center px-3 py-1 bg-neutral-100 rounded hover:bg-neutral-200 text-neutral-700 text-sm font-medium transition-colors">
              <RefreshCw className="w-4 h-4 mr-1" /> Reload
            </button>
            <div className="text-xs lg:text-sm text-neutral-600">
              {league.member_ids.length} members
            </div>
            <div className="text-xs lg:text-sm text-neutral-600">
              {league.buy_in} coins buy-in
            </div>
          </div>
        </div>
        
        {league.description && (
          <p className="text-neutral-600 mb-4 text-sm lg:text-base">{league.description}</p>
        )}
        {/* Winner and payout display */}
        {new Date(league.end_date) < new Date() && league.payout_processed && payout && (
          <div className="bg-green-100 rounded-lg p-4 my-4 border border-green-200">
            <h3 className="font-bold text-lg text-green-800">🏆 Winner: {winnerName}</h3>
            <p className="text-green-700">Prize: {payout.amount} coins</p>
            <p className="text-green-700">Payout processed: {new Date(payout.processed_at).toLocaleString()}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-gold" />
            <span className="text-xs lg:text-sm text-neutral-600">
              Ends: {new Date(league.end_date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Trophy className="h-4 w-4 lg:h-5 lg:w-5 text-gold" />
            <span className="text-xs lg:text-sm text-neutral-600">
              Join Code: {league.join_code}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-gold" />
            <span className="text-xs lg:text-sm text-neutral-600">
              Draft: {league.draft_completed ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Standings */}
        <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
          <h2 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Standings</h2>
          <div className="space-y-3">
            {standings.map((standing, index) => (
              <div
                key={standing.user_id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  standing.user_id === user?.id ? 'bg-gold bg-opacity-10 border border-gold' : 'bg-neutral-50 hover:bg-neutral-100'
                }`}
                onClick={() => handleUserClick(standing)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-bold ${
                    index < 3 ? 'bg-gold text-white' : 'bg-neutral-300 text-neutral-700'
                  }`}>
                    {standing.rank}
                  </div>
                  <div>
                    <p className="font-medium text-sm lg:text-base text-neutral-900">
                      {standing.display_name || standing.user_email}
                      {standing.user_id === user?.id && ' (You)'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm lg:text-base text-neutral-900">{standing.total_points} points</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Management */}
        <div className="space-y-4 lg:space-y-6">
          {/* Your Team */}
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Your Team</h3>
            {teamPlayers.length === 0 ? (
              <div className="text-neutral-500 text-sm">You haven't drafted any players yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {teamPlayers.map((player) => (
                  <div key={player.id} className="bg-neutral-50 rounded-lg p-3 text-center border border-gold">
                    <a 
                      href={`https://www.chess.com/member/${player.name}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-xs lg:text-sm text-gold hover:text-purple hover:underline cursor-pointer"
                    >
                      {player.name}
                    </a>
                    <div className="text-xs text-neutral-600">ELO: {player.elo}</div>
                    {player.accuracy !== undefined && player.accuracy !== null && (
                      <div className="text-xs text-neutral-500">Accuracy: {player.accuracy.toFixed(2)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Lineup */}
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg lg:text-xl font-bold text-neutral-900">Current Lineup</h3>
              {league.draft_completed && !isEditingLineup && (
                <button
                  type="button"
                  onClick={() => setIsEditingLineup(true)}
                  className="flex items-center space-x-1 text-gold hover:text-purple text-sm lg:text-base transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {isEditingLineup ? (
              <div className="space-y-4">
                <p className="text-xs lg:text-sm text-neutral-600">Select 5 players for your lineup:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teamPlayers.map((player) => (
                    <button
                      type="button"
                      key={player.id}
                      onClick={() => {
                        if (selectedLineupPlayers.includes(player.id)) {
                          setSelectedLineupPlayers(selectedLineupPlayers.filter(id => id !== player.id))
                        } else if (selectedLineupPlayers.length < 5) {
                          setSelectedLineupPlayers([...selectedLineupPlayers, player.id])
                        }
                      }}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedLineupPlayers.includes(player.id)
                          ? 'border-gold bg-gold bg-opacity-10'
                          : 'border-neutral-200 hover:border-gold'
                      }`}
                    >
                      <div className="font-medium text-sm lg:text-base text-neutral-900">{player.name}</div>
                      <div className="text-xs lg:text-sm text-neutral-600">ELO: {player.elo}</div>
                    </button>
                  ))}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={saveLineup}
                    disabled={selectedLineupPlayers.length !== 5}
                    className="flex items-center space-x-1 bg-gold hover:bg-purple disabled:bg-neutral-400 text-white px-3 lg:px-4 py-2 rounded-lg text-sm lg:text-base shadow-lg transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    <span>Save Lineup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingLineup(false)
                      setSelectedLineupPlayers(currentLineup?.player_ids || [])
                    }}
                    className="flex items-center space-x-1 bg-neutral-600 hover:bg-neutral-700 text-white px-3 lg:px-4 py-2 rounded-lg text-sm lg:text-base shadow-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {lineupPlayers.map((player) => (
                  <div key={player.id} className="bg-neutral-50 rounded-lg p-3 text-center border border-gold">
                    <a 
                      href={`https://www.chess.com/member/${player.name}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-xs lg:text-sm text-gold hover:text-purple hover:underline cursor-pointer"
                    >
                      {player.name}
                    </a>
                    <div className="text-xs text-neutral-600">ELO: {player.elo}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Point Breakdown Table */}
          <div className="mt-6">
            <div className="mb-2 flex items-center space-x-2">
              <h4 className="font-semibold text-neutral-900">Point Breakdown</h4>
              {availableWeeks.length > 0 && (
                <select
                  className="ml-2 border border-neutral-300 rounded px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-gold"
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
              <div className="text-neutral-600">Loading breakdown...</div>
            ) : breakdownError ? (
              <div className="text-red-600">{breakdownError}</div>
            ) : playerBreakdown && playerBreakdown.length > 0 ? (
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 text-neutral-900">Player</th>
                    <th className="text-right px-2 py-1 text-neutral-900">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {playerBreakdown.map((row) => (
                    <tr key={row.player_id || row.player_name}>
                      <td className="px-2 py-1 text-neutral-700">{row.player_name}</td>
                      <td className="px-2 py-1 text-right text-neutral-700">{Number(row.player_points).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-neutral-300">
                    <td className="px-2 py-1 text-neutral-900">TOTAL</td>
                    <td className="px-2 py-1 text-right text-neutral-900">{playerBreakdown.reduce((sum, p) => sum + Number(p.player_points), 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="text-neutral-600">No breakdown available for this week.</div>
            )}
          </div>

          {/* Draft Section */}

          {!league.draft_completed && (
            <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
              <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Draft</h3>
              {/* Show Start Draft button for owner if draft not started and before start date */}
              {isOwner && !draftStarted && beforeStartDate && (
                <button
                  type="button"
                  onClick={handleStartDraft}
                  className="mb-4 px-6 py-2 bg-gold hover:bg-purple text-white rounded-lg font-semibold shadow-lg transition-colors"
                  disabled={loading}
                >
                  Start Draft
                </button>
              )}
              {/* Show message if draft not started */}
              {!draftStarted && (
                <div className="text-center py-6 lg:py-8">
                  <p className="text-neutral-600 text-sm lg:text-base">
                    The draft has not started yet. The league owner can start the draft at any time before the league start date.
                  </p>
                </div>
              )}
              {/* Draft UI if started */}

              {draftStarted && (
                <>
                  {/* Debug/Fix buttons */}
                  {!league.member_ids.includes(user?.id || '') && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm mb-2">You are not a member of this league. Click to join:</p>
                      <button
                        type="button"
                        onClick={addUserToLeague}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 shadow-lg transition-colors"
                      >
                        Join League
                      </button>
                    </div>
                  )}
                  {league.draft_order.length < league.member_ids.length * 10 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm mb-2">Draft order appears to be incorrect. Click to fix:</p>
                      <button
                        type="button"
                        onClick={fixDraftOrder}
                        className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 shadow-lg transition-colors"
                      >
                        Fix Draft Order
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search players by name..."
                    className="mb-4 w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold text-neutral-900 placeholder-neutral-500"
                  />
                  {isUserTurn() ? (
                    <div>
                      <p className="text-green-600 font-medium mb-4 text-sm lg:text-base">It's your turn to draft!</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        {availablePlayers
                          .filter(player => player.name.toLowerCase().includes(search.toLowerCase()))
                          .map((player) => (
                            <button
                              type="button"
                              key={player.id}
                              onClick={() => draftPlayer(player.id)}
                              className="p-3 rounded-lg border border-neutral-200 hover:border-gold text-left w-full transition-colors"
                            >
                              <div className="font-semibold text-base lg:text-lg text-neutral-900">
                                <a 
                                  href={`https://www.chess.com/member/${player.name}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gold hover:text-purple hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {player.name}
                                </a>
                              </div>
                              <div className="text-xs lg:text-sm text-neutral-600">ELO: {player.elo}</div>
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 lg:py-8">
                      {league.current_draft_turn >= league.draft_order.length ? (
                        <p className="text-green-600 text-sm lg:text-base font-semibold">Draft complete!</p>
                      ) : (
                        (() => {
                          const currentDraftUserId = league.draft_order[league.current_draft_turn];
                          const displayName = userMap[currentDraftUserId] || 'Unknown Player';
                          
                          return (
                            <p className="text-neutral-600 text-sm lg:text-base">
                              Waiting for {displayName} to draft...
                            </p>
                          );
                        })()
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Popup Modal */}
      {showUserPopup && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gold">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">
                  {selectedUser.display_name || selectedUser.user_email}
                  {selectedUser.user_id === user?.id && ' (You)'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowUserPopup(false)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Team Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-neutral-900">Team ({selectedUserTeam.length} players)</h3>
                {selectedUserTeam.length === 0 ? (
                  <p className="text-neutral-500 text-sm">No players drafted yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {selectedUserTeam.map((player) => (
                      <div key={player.id} className="bg-neutral-50 rounded-lg p-3 text-center border border-gold">
                        <a 
                          href={`https://www.chess.com/member/${player.name}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-gold hover:text-purple hover:underline cursor-pointer"
                        >
                          {player.name}
                        </a>
                        <div className="text-xs text-neutral-600">ELO: {player.elo}</div>
                        {player.accuracy !== undefined && player.accuracy !== null && (
                          <div className="text-xs text-neutral-500">Accuracy: {player.accuracy.toFixed(2)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Lineup Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-neutral-900">Current Lineup ({selectedUserLineup.length}/5 players)</h3>
                {selectedUserLineup.length === 0 ? (
                  <p className="text-neutral-500 text-sm">No lineup set for this week.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {selectedUserLineup.map((player) => (
                      <div key={player.id} className="bg-gold bg-opacity-10 rounded-lg p-3 text-center border border-gold">
                        <a 
                          href={`https://www.chess.com/member/${player.name}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-gold hover:text-purple hover:underline cursor-pointer"
                        >
                          {player.name}
                        </a>
                        <div className="text-xs text-neutral-600">ELO: {player.elo}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaguePage 
