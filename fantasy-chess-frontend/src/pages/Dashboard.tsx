import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League, Team, Lineup, ChessPlayer } from '../types'
import { Crown, Users, Trophy, Calendar, Plus, ExternalLink } from 'lucide-react'

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [currentLeague, setCurrentLeague] = useState<League | null>(null)
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<ChessPlayer[]>([])
  const [currentLineup, setCurrentLineup] = useState<Lineup | null>(null)
  const [lineupPlayers, setLineupPlayers] = useState<ChessPlayer[]>([])
  const [pastLeagues, setPastLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get current league - try different approaches
      console.log('Dashboard - searching for leagues with user.id:', user.id)
      
      // First try: get all leagues and filter in JavaScript
      const { data: allLeagues, error: allLeaguesError } = await supabase
        .from('leagues')
        .select('*')
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })

      if (allLeaguesError) {
        console.error('Dashboard - all leagues query error:', allLeaguesError)
      }
      
      console.log('Dashboard - all leagues:', allLeagues)
      
      // Debug: show the member_ids for each league
      allLeagues?.forEach((league, index) => {
        console.log(`Dashboard - League ${index}:`, {
          id: league.id,
          name: league.name,
          member_ids: league.member_ids,
          member_ids_type: typeof league.member_ids,
          member_ids_length: league.member_ids?.length
        })
      })
      
      // Filter leagues where user is a member
      const leagues = allLeagues?.filter(league => {
        const isMember = league.member_ids && league.member_ids.includes(user.id)
        console.log(`Dashboard - Checking league ${league.id}: member_ids=${JSON.stringify(league.member_ids)}, user.id=${user.id}, isMember=${isMember}`)
        return isMember
      }) || []
      
      console.log('Dashboard - filtered leagues where user is member:', leagues)

      if (leagues && leagues.length > 0) {
        const league = leagues[0]
        setCurrentLeague(league)

        // Get user's team
        const { data: teams } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', user.id)
          .eq('league_id', league.id)
          .single()

        if (teams) {
          setUserTeam(teams)

          // Get team players
          const { data: players } = await supabase
            .from('chess_players')
            .select('*')
            .in('id', teams.player_ids)

          if (players) {
            setTeamPlayers(players)
          }

          // Get current lineup
          const currentWeek = getCurrentWeekStart()
          const { data: lineups } = await supabase
            .from('lineups')
            .select('*')
            .eq('user_id', user.id)
            .eq('league_id', league.id)
            .eq('week_start_date', currentWeek)
            .single()

          if (lineups) {
            setCurrentLineup(lineups)

            // Get lineup players
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

      // Get past league performance
      const { data: pastLeagueData } = await supabase
        .from('leagues')
        .select(`
          *,
          teams!inner(user_id, player_ids),
          lineups!inner(user_id, total_points, week_start_date)
        `)
        .contains('member_ids', [user.id])
        .lt('end_date', new Date().toISOString().split('T')[0])
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
            rank: 0, // Would need to calculate actual rank
            end_date: league.end_date
          }
        })
        setPastLeagues(processedPastLeagues)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentWeekStart = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday is 1, Sunday is 0
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysToSubtract)
    return monday.toISOString().split('T')[0]
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
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 lg:mb-8">Dashboard</h1>

      {!currentLeague ? (
        <div className="text-center py-12 lg:py-16">
          <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8 max-w-md mx-auto">
            <Crown className="h-12 w-12 lg:h-16 lg:w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl lg:text-2xl font-bold mb-4">No Active League</h2>
            <p className="text-gray-600 mb-6 text-sm lg:text-base">
              You're not currently in any active league. Join or create one to start playing!
            </p>
            <Link
              to="/join-league"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 lg:px-6 py-3 rounded-lg font-semibold"
            >
              <Plus className="h-5 w-5" />
              <span>Join a League</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6 lg:space-y-8">
          {/* Current League Info */}
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2 lg:mb-0">{currentLeague.name}</h2>
              <Link
                to={`/league/${currentLeague.id}`}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm lg:text-base"
              >
                View League →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 lg:h-6 lg:w-6 text-gray-500" />
                <div>
                  <p className="text-xs lg:text-sm text-gray-600">Members</p>
                  <p className="font-semibold text-sm lg:text-base">{currentLeague.member_ids.length}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Trophy className="h-5 w-5 lg:h-6 lg:w-6 text-gray-500" />
                <div>
                  <p className="text-xs lg:text-sm text-gray-600">Buy-in</p>
                  <p className="font-semibold text-sm lg:text-base">{currentLeague.buy_in} coins</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-gray-500" />
                <div>
                  <p className="text-xs lg:text-sm text-gray-600">End Date</p>
                  <p className="font-semibold text-sm lg:text-base">{new Date(currentLeague.end_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Lineup */}
          {userTeam && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Current Lineup</h3>
              
              {currentLineup && lineupPlayers.length > 0 ? (
                <div className="grid md:grid-cols-5 gap-4">
                  {lineupPlayers.map((player) => (
                    <div key={player.id} className="bg-gray-50 rounded-lg p-4 text-center">
                      <h4 className="font-semibold text-sm">{player.name}</h4>
                      <p className="text-xs text-gray-600">ELO: {player.elo}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No lineup set for this week</p>
                  <Link
                    to={`/league/${currentLeague.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Set Lineup
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Next Titled Tuesday */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Next Titled Tuesday</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  {getNextTitledTuesday().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-gray-600">Make sure your lineup is set before the tournament starts!</p>
              </div>
              <a
                href="https://www.chess.com/tournaments/titled-tuesday"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Watch Live</span>
              </a>
            </div>
          </div>

          {/* Past Performance */}
          {pastLeagues.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Past League Performance</h3>
              <div className="space-y-3">
                {pastLeagues.map((league) => (
                  <div key={league.league_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold">{league.league_name}</h4>
                      <p className="text-sm text-gray-600">
                        Ended: {new Date(league.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{league.total_points} points</p>
                      <p className="text-sm text-gray-600">Rank: {league.rank}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard 