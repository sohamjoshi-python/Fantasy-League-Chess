import * as React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League } from '../types'
import { Users, Trophy, Calendar, Search, Copy } from 'lucide-react'

// Helper function to send league joined email
const sendLeagueJoinedEmail = async (userEmail: string, leagueName: string) => {
  try {
    await supabase.functions.invoke('send-email', {
      body: {
        to: userEmail,
        subject: `Welcome to ${leagueName}!`,
        text: `You have successfully joined ${leagueName}. Get ready to draft players and compete!`
      }
    })
  } catch (error) {
    console.error('Error sending league joined email:', error)
    // Don't throw error - email failure shouldn't prevent joining
  }
}

const JoinLeague: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'create' | 'public' | 'code'>('create')
  const [publicLeagues, setPublicLeagues] = useState<League[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userLeagues, setUserLeagues] = useState<League[]>([]);

  // Create league form state
  const [leagueName, setLeagueName] = useState('')
  const [leagueDescription, setLeagueDescription] = useState('')
  const [buyIn, setBuyIn] = useState(10)
  const [maxMembers, setMaxMembers] = useState(10)
  const [isPublic, setIsPublic] = useState(true)
  const [startDate, setStartDate] = useState('')

  useEffect(() => {
    if (activeTab === 'public') {
      loadPublicLeagues()
    }
  }, [activeTab])

  useEffect(() => {
    async function fetchUserLeagues() {
      if (!user) return;
      const { data: leagues } = await supabase
        .from('leagues')
        .select('*')
        .contains('member_ids', [user.id]);
      if (leagues) setUserLeagues(leagues);
    }
    fetchUserLeagues();
  }, [user]);

  // Helper to check for overlapping dates
  function hasDateOverlap(startA: string, endA: string, startB: string, endB: string) {
    return !(endA < startB || endB < startA);
  }

  // Helper to get tomorrow's date in yyyy-mm-dd format
  function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  const loadPublicLeagues = async () => {
    try {
      const { data: leagues } = await supabase
        .from('leagues')
        .select('*')
        .eq('is_public', true)
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })

      if (leagues) {
        setPublicLeagues(leagues)
      }
    } catch (error) {
      console.error('Error loading public leagues:', error)
    }
  }

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const createLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      setError('')

      // Validate buy-in
      if (buyIn < 1) {
        setError('Buy-in must be at least 1 coin')
        return
      }

      // Validate start date (must be at least tomorrow)
      const tomorrowStr = getTomorrowDate();
      if (!startDate || startDate < tomorrowStr) {
        setError('Start date must be at least tomorrow.')
        return
      }

      // Check for overlapping active leagues
      const newStart = startDate;
      const endDateObj = new Date(startDate);
      endDateObj.setMonth(endDateObj.getMonth() + 1);
      endDateObj.setDate(0);
      const newEnd = endDateObj.toISOString().split('T')[0];
      const overlap = userLeagues.some(l => hasDateOverlap(newStart, newEnd, l.start_date, l.end_date) && l.end_date >= new Date().toISOString().split('T')[0]);
      if (overlap) {
        setError('You cannot create a league that overlaps with another active league you are in.');
        return;
      }

      // Check if user has enough coins
      const { data: userData } = await supabase
        .from('users')
        .select('coins')
        .eq('id', user.id)
        .single()

      if (!userData || userData.coins < buyIn) {
        setError('You don\'t have enough coins for this buy-in')
        return
      }

      // Get user's username from users table
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (userData?.username) {
          // displayName = userData.username;
        }
      } catch (err) {
        console.error('Error getting user username:', err);
      }

      const joinCode = generateJoinCode()
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0) // Last day of the month

      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .insert({
          name: leagueName,
          description: leagueDescription,
          is_public: isPublic,
          buy_in: buyIn,
          max_members: maxMembers,
          start_date: startDate,
          end_date: endDate.toISOString().split('T')[0],
          join_code: joinCode,
          creator_id: user.id,
          member_ids: [user.id],
          draft_order: [user.id],
          current_draft_turn: 0,
          draft_completed: false
        })
        .select()
        .single()

      if (leagueError) throw leagueError

      // Create league data for the user (teams, coin balance, lineups)
      try {
        const { error: createDataError } = await supabase.rpc('create_league_data_for_user', {
          user_id_input: user.id,
          league_id_input: league.id
        });
        if (createDataError) {
          console.log('Error creating league data (will be created automatically):', createDataError);
        }
      } catch (err) {
        console.log('League data creation failed (will be created automatically):', err);
      }

      // Note: Creator is already added to member_ids array in the league creation above
      // No need to insert into league_members table since it doesn't exist anymore

      // Deduct coins from user
      await supabase
        .from('users')
        .update({ coins: userData.coins - buyIn })
        .eq('id', user.id)

      // Send league joined email
      if (user.email) {
        await sendLeagueJoinedEmail(user.email, leagueName)
      }

      // Create Discord channel for the league
      try {
        console.log('Creating Discord channel for league...');
        const discordResponse = await supabase.functions.invoke('discord-bot-hybrid', {
          body: {
            action: 'create_league_channel',
            leagueName: leagueName,
            leagueId: league.id
          }
        });
        
        if (discordResponse.error) {
          console.error('Discord function error:', discordResponse.error);
          throw new Error(discordResponse.error.message || 'Discord function failed');
        }
        
        console.log('Discord channel created:', discordResponse);
      } catch (error) {
        console.error('Error creating Discord channel (continuing without Discord):', error);
        // Continue without Discord - this is not critical
      }

      navigate(`/league/${league.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create league')
    } finally {
      setLoading(false)
    }
  }

  const joinLeagueWithCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !joinCode.trim()) return

    try {
      setLoading(true)
      setError('')

      const joinCodeInput = joinCode.trim().toUpperCase();
      
      // Look up the league by join code
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('join_code', joinCodeInput)
        .single();

      if (leagueError) {
        setError('Invalid join code');
        return;
      }

      if (!league) {
        setError('League not found');
        return;
      }

      if (league.draft_started || new Date(league.start_date) <= new Date()) {
        setError('You cannot join a league that is in progress or has already started.');
        return;
      }

      // Check for overlapping active leagues
      const overlap = userLeagues.some(l => hasDateOverlap(league.start_date, league.end_date, l.start_date, l.end_date) && l.end_date >= new Date().toISOString().split('T')[0]);
      if (overlap) {
        setError('You cannot join a league that overlaps with another active league you are in.');
        return;
      }

      if (league.member_ids.includes(user.id)) {
        setError('You are already a member of this league')
        return
      }

      // Check if user has enough coins
      const { data: userData } = await supabase
        .from('users')
        .select('coins')
        .eq('id', user.id)
        .single()

      if (!userData || userData.coins < league.buy_in) {
        setError('You don\'t have enough coins for this league')
        return
      }

      // Get user's display name from users table
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('display_name, username')
          .eq('id', user.id)
          .single();
        
        if (userData?.display_name && userData.display_name.trim() !== '') {
          // displayName = userData.display_name;
        } else if (userData?.username) {
          // displayName = userData.username;
        }
      } catch (err) {
        console.error('Error getting user display name:', err);
      }

      // Add user to league
      const updatedMemberIds = [...league.member_ids, user.id]
      const updatedDraftOrder = [...league.draft_order, user.id]

      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          member_ids: updatedMemberIds,
          draft_order: updatedDraftOrder
        })
        .eq('id', league.id)

      if (updateError) throw updateError

      // Create league data for the user (teams, coin balance, lineups)
      try {
        const { error: createDataError } = await supabase.rpc('create_league_data_for_user', {
          user_id_input: user.id,
          league_id_input: league.id
        });
        if (createDataError) {
          console.log('Error creating league data (will be created automatically):', createDataError);
        }
      } catch (err) {
        console.log('League data creation failed (will be created automatically):', err);
      }

      // Note: User is already added to member_ids array in the league update above
      // No need to insert into league_members table since it doesn't exist anymore

      // Deduct coins from user
      await supabase
        .from('users')
        .update({ coins: userData.coins - league.buy_in })
        .eq('id', user.id)

      // Send league joined email
      if (user.email) {
        await sendLeagueJoinedEmail(user.email, league.name)
      }

      // Create Discord channel if it doesn't exist
      if (!league.discord_server_id) {
        try {
          console.log('Creating Discord channel for league...');
          const discordResponse = await supabase.functions.invoke('discord-bot-hybrid', {
            body: {
              action: 'create_league_channel',
              leagueName: league.name,
              leagueId: league.id
            }
          });
          console.log('Discord channel created:', discordResponse);
        } catch (error) {
          console.log('Error creating Discord channel (continuing without Discord):', error);
          // Continue without Discord - this is not critical
        }
      }

      navigate(`/league/${league.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to join league')
    } finally {
      setLoading(false)
    }
  }

  const joinPublicLeague = async (league: League) => {
    if (!user) return

    try {
      setLoading(true)
      setError('')

      if (league.draft_started || new Date(league.start_date) <= new Date()) {
        setError('You cannot join a league that is in progress or has already started.');
        return;
      }

      // Check for overlapping active leagues
      const overlap = userLeagues.some(l => hasDateOverlap(league.start_date, league.end_date, l.start_date, l.end_date) && l.end_date >= new Date().toISOString().split('T')[0]);
      if (overlap) {
        setError('You cannot join a league that overlaps with another active league you are in.');
        return;
      }

      if (league.member_ids.includes(user.id)) {
        setError('You are already a member of this league')
        return
      }

      // Check if league is full using max_members field
      const maxMembers = league.max_members || 10
      if (league.member_ids.length >= maxMembers) {
        setError(`League is full (${league.member_ids.length}/${maxMembers} members)`)
        return
      }

      // Check if user has enough coins
      const { data: userData } = await supabase
        .from('users')
        .select('coins')
        .eq('id', user.id)
        .single()

      if (!userData || userData.coins < league.buy_in) {
        setError('You don\'t have enough coins for this league')
        return
      }

      // Get user's username from users table
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (userData?.username) {
          // displayName = userData.username;
        }
      } catch (err) {
        console.error('Error getting user username:', err);
      }

      // Note: User will be added to member_ids array in the league update below
      // No need to insert into league_members table since it doesn't exist anymore

      // Add user to league
      const updatedMemberIds = [...league.member_ids, user.id]
      const updatedDraftOrder = [...league.draft_order, user.id]

      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          member_ids: updatedMemberIds,
          draft_order: updatedDraftOrder
        })
        .eq('id', league.id)

      if (updateError) throw updateError

      // Create league data for the user (teams, coin balance, lineups)
      try {
        const { error: createDataError } = await supabase.rpc('create_league_data_for_user', {
          user_id_input: user.id,
          league_id_input: league.id
        });
        if (createDataError) {
          console.log('Error creating league data (will be created automatically):', createDataError);
        }
      } catch (err) {
        console.log('League data creation failed (will be created automatically):', err);
      }

      // Deduct coins from user
      await supabase
        .from('users')
        .update({ coins: userData.coins - league.buy_in })
        .eq('id', user.id)

      // Send league joined email
      if (user.email) {
        await sendLeagueJoinedEmail(user.email, league.name)
      }

      // Create Discord channel if it doesn't exist
      if (!league.discord_server_id) {
        try {
          console.log('Creating Discord channel for league...');
          const discordResponse = await supabase.functions.invoke('discord-bot-hybrid', {
            body: {
              action: 'create_league_channel',
              leagueName: league.name,
              leagueId: league.id
            }
          });
          console.log('Discord channel created:', discordResponse);
        } catch (error) {
          console.log('Error creating Discord channel (continuing without Discord):', error);
          // Continue without Discord - this is not critical
        }
      }

      navigate(`/league/${league.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to join league')
    } finally {
      setLoading(false)
    }
  }

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white min-h-screen p-4 lg:p-6">
      <h1 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 text-neutral-900">Join a League</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-neutral-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 px-3 lg:px-4 rounded-md font-medium transition-colors text-sm lg:text-base ${
            activeTab === 'create'
              ? 'bg-white text-royalBlue shadow-sm border border-royalBlue'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Create League
        </button>
        <button
          onClick={() => setActiveTab('public')}
          className={`flex-1 py-2 px-3 lg:px-4 rounded-md font-medium transition-colors text-sm lg:text-base ${
            activeTab === 'public'
              ? 'bg-white text-royalBlue shadow-sm border border-royalBlue'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Public Leagues
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-2 px-3 lg:px-4 rounded-md font-medium transition-colors text-sm lg:text-base ${
            activeTab === 'code'
              ? 'bg-white text-royalBlue shadow-sm border border-royalBlue'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Join with Code
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Create League Tab */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-royalBlue">
          <h2 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6 text-neutral-900">Create Your Own League</h2>
          <form onSubmit={createLeague} className="space-y-4 lg:space-y-6">
            <div>
              <label htmlFor="leagueName" className="block text-sm font-medium text-neutral-700 mb-2">
                League Name *
              </label>
              <input
                type="text"
                id="leagueName"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                placeholder="Enter league name"
              />
            </div>

            <div>
              <label htmlFor="leagueDescription" className="block text-sm font-medium text-neutral-700 mb-2">
                Description
              </label>
              <textarea
                id="leagueDescription"
                value={leagueDescription}
                onChange={(e) => setLeagueDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                placeholder="Optional description for your league"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <label htmlFor="buyIn" className="block text-sm font-medium text-neutral-700 mb-2">
                  Buy-in (coins) *
                </label>
                <input
                  type="number"
                  id="buyIn"
                  value={buyIn}
                  onChange={(e) => setBuyIn(parseInt(e.target.value) || 0)}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900"
                />
              </div>

              <div>
                <label htmlFor="maxMembers" className="block text-sm font-medium text-neutral-700 mb-2">
                  Max Members *
                </label>
                <input
                  type="number"
                  id="maxMembers"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(parseInt(e.target.value) || 10)}
                  min="2"
                  max="100"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900"
                />
                <p className="text-xs text-neutral-500 mt-1">Default: 10, Max: 100</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-1 overflow-visible">
                  Start Date (first of month) *
                  <span className="relative group cursor-pointer align-middle">
                    <svg className="w-4 h-4 text-royalBlue inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 w-64 bg-white text-neutral-900 text-xs rounded shadow-lg border border-royalBlue px-3 py-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal">
                      The start date is when the league officially begins and points start accumulating. The draft must be completed before this date.
                    </span>
                  </span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  min={getTomorrowDate()}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 text-royalBlue focus:ring-royalBlue border-neutral-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-neutral-900">
                Make this league public (others can find and join it)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e293b] hover:bg-royalBlue disabled:bg-neutral-400 text-white py-3 px-4 rounded-lg font-semibold shadow-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create League'}
            </button>
          </form>
        </div>
      )}
      {/* Public Leagues Tab */}
      {activeTab === 'public' && (
        <div className="space-y-4 lg:space-y-6">
          <h2 className="text-xl lg:text-2xl font-bold text-neutral-900">Public Leagues</h2>
          {publicLeagues.length === 0 ? (
            <div className="text-center py-8 lg:py-12 bg-white rounded-lg shadow-lg border-2 border-royalBlue">
              <Search className="h-8 w-8 lg:h-12 lg:w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 text-sm lg:text-base">No public leagues available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {publicLeagues.map((league) => {
                if (!user) return null;
                const alreadyMember = league.member_ids.includes(user.id);
                const maxMembers = league.max_members || 10;
                const isFull = league.member_ids.length >= maxMembers;
                return (
                  <div key={league.id} className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-royalBlue">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base lg:text-lg font-semibold text-neutral-900">{league.name}</h3>
                      <button
                        onClick={() => copyJoinCode(league.join_code)}
                        className="text-royalBlue hover:text-purple transition-colors"
                        title="Copy join code"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {league.description && (
                      <p className="text-neutral-600 text-xs lg:text-sm mb-4">{league.description}</p>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-royalBlue" />
                        <span className="text-xs lg:text-sm text-neutral-600">
                          {league.member_ids.length}/{maxMembers} members
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Trophy className="h-4 w-4 text-royalBlue" />
                        <span className="text-xs lg:text-sm text-neutral-600">
                          {league.buy_in} coins buy-in
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-royalBlue" />
                        <span className="text-xs lg:text-sm text-neutral-600">
                          Starts {new Date(league.start_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      className={`w-full bg-[#1e293b] hover:bg-royalBlue disabled:bg-neutral-400 text-white py-2 px-4 rounded-lg font-medium text-sm lg:text-base shadow-lg transition-colors ${alreadyMember || isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={alreadyMember || isFull}
                      title={alreadyMember ? 'You are already a member of this league' : isFull ? 'League is full' : 'Join this league'}
                      onClick={() => !alreadyMember && !isFull && joinPublicLeague(league)}
                    >
                      {loading ? 'Joining...' : alreadyMember ? 'Already Member' : isFull ? 'League Full' : 'Join League'}
                    </button>
                    {alreadyMember && (
                      <div className="text-xs text-neutral-500 mt-1">You are already a member of this league</div>
                    )}
                    {isFull && !alreadyMember && (
                      <div className="text-xs text-neutral-500 mt-1">League is full</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Join with Code Tab */}
      {activeTab === 'code' && (
        <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-royalBlue">
          <h2 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6 text-neutral-900">Join with Code</h2>
          <form onSubmit={joinLeagueWithCode} className="space-y-4 lg:space-y-6">
            <div>
              <label htmlFor="joinCode" className="block text-sm font-medium text-neutral-700 mb-2">
                League Join Code *
              </label>
              <input
                type="text"
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                placeholder="Enter 6-character code"
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e293b] hover:bg-royalBlue disabled:bg-neutral-400 text-white py-3 px-4 rounded-lg font-semibold shadow-lg transition-colors"
            >
              {loading ? 'Joining...' : 'Join League'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default JoinLeague 
