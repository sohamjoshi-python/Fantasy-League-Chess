import * as React from 'react'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League, Team, Lineup, ChessPlayer, Bot } from '../types'
import { Crown, Trophy, Calendar, Edit, Check, X, RefreshCw, Bot as BotIcon, Plus, Trash2 } from 'lucide-react'
import { fetchLineupPlayerBreakdown, createBot, removeBot, autoDraftForBot, autoSetLineupForBot } from '../lib/supabase';
import Confetti from 'react-confetti';
// Remove: import { useQuery } from '@tanstack/react-query';
// Remove: fetchLeague function
// Remove: all useQuery calls and destructuring
// Restore: const [league, setLeague] = useState<League | null>(null)
// Restore: const [loading, setLoading] = useState(true)
// Restore: const [error, setError] = useState('')
// Restore: useEffect(() => { if (leagueId && user) { loadLeagueData() } }, [leagueId, user])
// Restore: all setLeague, league, loading, and error usages

// Expandable username component
const ExpandableUsername: React.FC<{
  username: string;
  isCurrentUser?: boolean;
  className?: string;
  maxWidth?: string; // e.g., "100px"
}> = ({ username, isCurrentUser = false, className = "", maxWidth = "100px" }) => {
  const [hovered, setHovered] = React.useState(false);
  const displayText = username + (isCurrentUser ? " (You)" : "");

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ maxWidth }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="truncate overflow-hidden whitespace-nowrap block text-neutral-900 font-medium text-sm lg:text-base"
        style={{ maxWidth, cursor: "pointer" }}
        title={displayText}
      >
        {displayText}
      </span>
      {hovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-8 z-50 bg-white text-neutral-900 px-3 py-1 rounded shadow-lg border border-gold text-xs font-medium whitespace-normal"
          style={{ minWidth: "max-content", maxWidth: "300px" }}
        >
          {displayText}
        </div>
      )}
    </div>
  );
};

// Expandable player name component
const ExpandablePlayerName: React.FC<{
  playerName: string;
  className?: string;
  href?: string;
  maxWidth?: string; // e.g., "80px"
}> = ({ playerName, className = "", href, maxWidth = "80px" }) => {
  const [hovered, setHovered] = React.useState(false);

  const content = (
    <span
      className={`truncate overflow-hidden whitespace-nowrap block font-medium text-xs lg:text-sm text-gold hover:text-purple hover:underline cursor-pointer ${className}`}
      style={{ maxWidth, cursor: "pointer" }}
      title={playerName}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {playerName}
      {hovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-8 z-50 bg-white text-neutral-900 px-3 py-1 rounded shadow-lg border border-gold text-xs font-medium whitespace-normal"
          style={{ minWidth: "max-content", maxWidth: "300px" }}
        >
          {playerName}
        </div>
      )}
    </span>
  );

  if (href) {
    return (
      <div className={`relative inline-block ${className}`} style={{ maxWidth }}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {content}
        </a>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} style={{ maxWidth }}>
      {content}
    </div>
  );
};

// Remove the fetchLeague function entirely

// Auto-complete teams with random players if league has started and draft is incomplete
const autoCompleteTeamsIfNeeded = async (leagueData: any) => {
  const today = new Date().toISOString().split('T')[0];
  if (
    leagueData.draft_started &&
    !leagueData.draft_completed &&
    leagueData.start_date <= today
  ) {
    // Fetch all teams for this league
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', leagueData.id);
    // Fetch all chess players
    const { data: allPlayers } = await supabase
      .from('chess_players')
      .select('id');
    if (!allPlayers) return;
    // Build set of already drafted player IDs
    const drafted = new Set();
    (teams || []).forEach(team => {
      (team.player_ids || []).forEach((id: string) => drafted.add(id));
    });
    // Pool of available players
    let available = allPlayers.filter(p => !drafted.has(p.id)).map(p => p.id);
    // For each team, fill up to 10 players
    for (const team of teams || []) {
      const current = team.player_ids || [];
      const needed = 10 - current.length;
      if (needed > 0) {
        // Randomly select needed players
        const chosen: string[] = [];
        for (let i = 0; i < needed && available.length > 0; i++) {
          const idx = Math.floor(Math.random() * available.length);
          chosen.push(available[idx]);
          available.splice(idx, 1);
        }
        const newPlayerIds = [...current, ...chosen];
        await supabase
          .from('teams')
          .update({ player_ids: newPlayerIds })
          .eq('id', team.id);
      }
    }
    // After all teams are filled, mark draft as completed
    await supabase
      .from('leagues')
      .update({ draft_completed: true })
      .eq('id', leagueData.id);
    // Reload league data to reflect changes
    // await loadLeagueData(); // This line was removed as per the edit hint
  }
};

const LeaguePage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate();

  // React Query for league data
  // Remove: const {
  // Remove:   data: league,
  // Remove:   isLoading: leagueLoading,
  // Remove:   error: leagueError,
  // Remove: } = useQuery<League | undefined>(
  // Remove:   ['league', leagueId],
  // Remove:   () => (leagueId ? fetchLeague(leagueId) : undefined),
  // Remove:   {
  // Remove:     enabled: !!leagueId,
  // Remove:     staleTime: 1000 * 60 * 10, // 10 minutes
  // Remove:     cacheTime: 1000 * 60 * 60, // 1 hour
  // Remove:   }
  // Remove: );

  // TODO: Refactor other fetches (team, players, standings, etc.) to use React Query

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
  const isOwner = user?.id && league && user.id === league?.creator_id;
  // Helper: is draft started?
  const draftStarted = !!league?.draft_started;
  // Helper: is it before league start date?
  const beforeStartDate = league && new Date() < new Date(league?.start_date);

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
  const [showConfetti, setShowConfetti] = useState(false);

  const [bot, setBot] = useState<Bot | null>(null)
  const [botLoading, setBotLoading] = useState(false)
  const [botDrafting, setBotDrafting] = useState(false)
  const [showAddBotModal, setShowAddBotModal] = useState(false)
  const [botName, setBotName] = useState('')
  const [botNameError, setBotNameError] = useState('')

  // Track the last draft turn the bot drafted for
  const lastBotDraftTurnRef = React.useRef<number | null>(null);

  useEffect(() => {
    async function fetchAvailableWeeks() {
      if (!league || !user) return;
      // Fetch all weeks from lineups table where user has a lineup with points > 0
      const { data, error } = await supabase
        .from('lineups')
        .select('week_start_date')
        .eq('user_id', user.id)
        .eq('league_id', league?.id)
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
        const data = await fetchLineupPlayerBreakdown(user.id, league?.id, selectedWeek.replace(/\./g, '-'));
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
        new Date(league?.end_date) < new Date() &&
        !league?.payout_processed
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

  // Handle bot turns during draft
  
  useEffect(() => {
    if (league && bot && draftStarted && !league.draft_completed && !botDrafting) {
      const currentDraftUserId = league.draft_order[league.current_draft_turn]

      // Debug logging
      console.log('Draft debug:', {
        currentTurn: league.current_draft_turn,
        currentUserId: currentDraftUserId,
        botId: bot.id,
        draftOrder: league.draft_order,
        isBotTurn: currentDraftUserId === bot.id,
        botDrafting
      })

      // Only draft if we haven't already drafted for this turn
      if (currentDraftUserId === bot.id && lastBotDraftTurnRef.current !== league.current_draft_turn) {
        const handleBotTurn = async () => {
          try {
            setBotDrafting(true)
            // Fetch bot's team and check size before drafting
            const { data: team } = await supabase
              .from('teams')
              .select('player_ids')
              .eq('bot_id', bot.id)
              .eq('league_id', league.id)
              .single();
            if (team && Array.isArray(team.player_ids) && team.player_ids.length >= 10) {
              console.log('Bot team already full, skipping draft');
              lastBotDraftTurnRef.current = league.current_draft_turn;
              return;
            }
            console.log('🤖 Bot is drafting...')
            const { success, error } = await autoDraftForBot(bot.id, league.id)
            if (success) {
              console.log('✅ Bot draft successful')
              lastBotDraftTurnRef.current = league.current_draft_turn;
              // Reload league data to update draft state
              await loadLeagueData()
            } else {
              console.error('❌ Bot auto-draft failed:', error)
            }
          } catch (error) {
            console.error('❌ Error in bot auto-draft:', error)
          } finally {
            setBotDrafting(false)
          }
        }

        // Execute immediately without delay
        handleBotTurn()
      }
    }
  }, [league?.current_draft_turn, bot, draftStarted, league?.draft_completed, botDrafting])

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

      setLeague(leagueData);
      await autoCompleteTeamsIfNeeded(leagueData);
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

      // Load bot data if league has a bot
      if (leagueData.bot_id) {
        const { data: botData, error: botError } = await supabase
          .from('bots')
          .select('*')
          .eq('id', leagueData.bot_id)
          .single()
        
        if (!botError && botData) {
          setBot(botData)
        }
      }

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
          if (lineup.user_id) {
            const current = userPoints.get(lineup.user_id) || 0
            userPoints.set(lineup.user_id, current + lineup.total_points)
          }
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

      // Add bot to standings if it exists
      if (bot) {
        // Sum up all lineups for this bot by bot_id
        let botPoints = 0
        if (lineups) {
          botPoints = lineups
            .filter(lineup => lineup.bot_id === bot.id)
            .reduce((sum, lineup) => sum + (lineup.total_points || 0), 0)
        }
        standingsData.push({
          user_id: bot.id,
          user_email: `${bot.name}@bot`,
          display_name: `${bot.name} 🤖`,
          total_points: botPoints,
          rank: 0
        })
      }

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
    // Ensure we get a clean date string without timezone issues
    const year = monday.getFullYear()
    const month = String(monday.getMonth() + 1).padStart(2, '0')
    const day = String(monday.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isUserTurn = () => {
    if (!league || !user) return false
    const currentDraftUserId = league?.draft_order[league?.current_draft_turn]
    return currentDraftUserId === user.id
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
          .insert({ user_id: user.id, league_id: league?.id, player_ids: [] })
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
      const newDraftTurn = league?.current_draft_turn + 1
      // Include bot in draft completion calculation
      const totalDraftParticipants = bot ? league.member_ids.length + 1 : league.member_ids.length
      const isDraftComplete = newDraftTurn >= totalDraftParticipants * 10
      const { error: leagueError } = await supabase
        .from('leagues')
        .update({ current_draft_turn: newDraftTurn, draft_completed: isDraftComplete })
        .eq('id', league?.id)
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
          league_id: league?.id,
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
    // Deduplicate participant IDs to avoid duplicate turns
    const uniqueIds = Array.from(new Set(memberIds));
    const order: string[] = [];
    for (let round = 0; round < rounds; round++) {
      if (round % 2 === 0) {
        order.push(...uniqueIds);
      } else {
        order.push(...[...uniqueIds].reverse());
      }
    }
    return order;
  }

  // Fix draft order if it's incorrect
  const fixDraftOrder = async () => {
    if (!league) return
    try {
      // Include bot in draft order if it exists
      const allDraftParticipants = bot ? [...league.member_ids, bot.id] : league.member_ids
      const fullDraftOrder = generateSnakeDraftOrder(allDraftParticipants, 10)
      await supabase.from('leagues').update({ 
        draft_order: fullDraftOrder,
        current_draft_turn: 0
      }).eq('id', league?.id)
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
      if (league?.member_ids && league?.member_ids.includes(user.id)) {
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
      
      const updatedMemberIds = [...(league?.member_ids || []), user.id]
      
      // Include bot in draft order if it exists
      const allDraftParticipants = bot ? [...updatedMemberIds, bot.id] : updatedMemberIds
      const updatedDraftOrder = generateSnakeDraftOrder(allDraftParticipants, 10)
      

      
      // Add user to league_members table first
      const { error: memberError } = await supabase
        .from('league_members')
        .insert({
          league_id: league?.id,
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
      }).eq('id', league?.id)
      
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
        setLeague(updatedLeague) // This line is removed as league is now managed by React Query
        // fetchUserMap(updatedMemberIds) // This line is removed as league is now managed by React Query
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
      // Generate full snake draft order including bot if it exists
      const allDraftParticipants = bot ? [...league.member_ids, bot.id] : league.member_ids
      const fullDraftOrder = generateSnakeDraftOrder(allDraftParticipants, 10)
      await supabase.from('leagues').update({ 
        draft_started: true, 
        draft_start_time: new Date().toISOString(),
        draft_order: fullDraftOrder,
        current_draft_turn: 0
      }).eq('id', league?.id)
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

  // Bot management functions
  const handleAddBot = async () => {
    if (!league || !botName.trim()) {
      setBotNameError('Please enter a bot name')
      return
    }

    if (bot) {
      setBotNameError('League already has a bot')
      return
    }

    try {
      setBotLoading(true)
      setBotNameError('')

      const { success, bot: newBot, error } = await createBot(league.id, botName.trim())
      
      if (success && newBot) {
        setBot(newBot)
        setShowAddBotModal(false)
        setBotName('')
        
        // Update league with bot_id, add bot to member_ids, and regenerate draft order
        const allDraftParticipants = [...league.member_ids, newBot.id]
        const updatedDraftOrder = generateSnakeDraftOrder(allDraftParticipants, 10)
        
        await supabase
          .from('leagues')
          .update({ 
            bot_id: newBot.id,
            member_ids: allDraftParticipants, // Add bot to member_ids
            draft_order: updatedDraftOrder,
            current_draft_turn: 0
          })
          .eq('id', league.id)
        
        // Reload league data to update draft order
        await loadLeagueData()
      } else {
        setBotNameError(error?.message || 'Failed to create bot')
      }
    } catch (error: any) {
      setBotNameError(error.message || 'Failed to create bot')
    } finally {
      setBotLoading(false)
    }
  }

  const handleRemoveBot = async () => {
    if (!league || !bot) return

    try {
      setBotLoading(true)

      const { success, error } = await removeBot(bot.id)
      
      if (success) {
        setBot(null)
        
        // Update league to remove bot_id, remove bot from member_ids, and regenerate draft order
        const updatedMemberIds = (league.member_ids || []).reduce((acc: string[], id: string | undefined) => {
          if (typeof id === 'string' && user?.id && id !== String(user.id)) acc.push(id);
          return acc;
        }, []);
        const updatedDraftOrder = generateSnakeDraftOrder(updatedMemberIds, 10)
        
        await supabase
          .from('leagues')
          .update({ 
            bot_id: null,
            member_ids: updatedMemberIds, // Remove bot from member_ids
            draft_order: updatedDraftOrder,
            current_draft_turn: 0
          })
          .eq('id', league.id)
        
        // Reload league data to update draft order
        await loadLeagueData()
      } else {
        console.error('Failed to remove bot:', error)
      }
    } catch (error: any) {
      console.error('Error removing bot:', error)
    } finally {
      setBotLoading(false)
    }
  }

  const handleBotDraft = async () => {
    if (!league || !bot) return

    try {
      setBotLoading(true)

      const { success, error } = await autoDraftForBot(bot.id, league.id)
      
      if (success) {
        // Reload league data to update draft state
        await loadLeagueData()
      } else {
        console.error('Failed to auto-draft for bot:', error)
      }
    } catch (error: any) {
      console.error('Error auto-drafting for bot:', error)
    } finally {
      setBotLoading(false)
    }
  }

  const handleBotSetLineup = async () => {
    if (!league || !bot) return

    try {
      setBotLoading(true)

      const currentWeek = getCurrentWeekStart()
      const { success, error } = await autoSetLineupForBot(bot.id, league.id, currentWeek)
      
      if (success) {
        // Reload league data to update lineup
        await loadLeagueData()
      } else {
        console.error('Failed to set lineup for bot:', error)
      }
    } catch (error: any) {
      console.error('Error setting lineup for bot:', error)
    } finally {
      setBotLoading(false)
    }
  }

  // Handle user click in standings
  const handleUserClick = async (userData: any) => {
    try {
      setSelectedUser(userData)
      setShowUserPopup(true)

      // Get user's team
      let teamData = null;
      if (bot && userData.user_id === bot.id) {
        // Fetch bot's team by bot_id
        const { data } = await supabase
          .from('teams')
          .select('*')
          .eq('bot_id', bot.id)
          .eq('league_id', leagueId!)
          .single();
        teamData = data;
      } else {
        // Fetch user's team by user_id
        const { data } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', userData.user_id)
          .eq('league_id', leagueId!)
          .single();
        teamData = data;
      }

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
      let lineupData = null;
      if (bot && userData.user_id === bot.id) {
        const { data } = await supabase
          .from('lineups')
          .select('*')
          .eq('bot_id', bot.id)
          .eq('league_id', leagueId!)
          .eq('week_start_date', currentWeek)
          .single();
        lineupData = data;
      } else {
        const { data } = await supabase
          .from('lineups')
          .select('*')
          .eq('user_id', userData.user_id)
          .eq('league_id', leagueId!)
          .eq('week_start_date', currentWeek)
          .single();
        lineupData = data;
      }

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
        new Date(league?.end_date) < new Date() &&
        league?.payout_processed
      ) {
        const { data: payoutData } = await supabase
          .from('payouts')
          .select('user_id, amount, processed_at')
          .eq('league_id', league?.id)
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
              .eq('league_id', league?.id)
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

  // Show confetti for a few seconds when the league is completed and podium is shown
  useEffect(() => {
    if (league?.draft_completed || (league?.end_date && new Date(league.end_date) < new Date())) {
      setShowConfetti(true);
      const timeout = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [league?.draft_completed, league?.end_date]);

  // Delete league (admin only)
  const handleDeleteLeague = async () => {
    if (!league || !isOwner) return;
    if (!window.confirm('Are you sure you want to delete this league? This cannot be undone.')) return;
    setLoading(true);
    try {
      // Delete the league (cascades to teams, lineups, league_members, bots, etc.)
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', league.id);
      if (error) throw error;
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to delete league');
    } finally {
      setLoading(false);
    }
  };

  // Leave league (for non-owners)
  const handleLeaveLeague = async () => {
    if (!league || !user || isOwner) return;
    if (!user.id) return;
    if (!window.confirm('Are you sure you want to leave this league?')) return;
    setLoading(true);
    try {
      // Remove from league_members
      await supabase
        .from('league_members')
        .delete()
        .eq('league_id', league.id)
        .eq('user_id', user.id);
      // Remove from member_ids in leagues
      const updatedMemberIds = (league.member_ids || []).reduce((acc: string[], id: string | undefined) => {
        if (typeof id === 'string' && user?.id && id !== String(user.id)) acc.push(id);
        return acc;
      }, []);
      await supabase
        .from('leagues')
        .update({ member_ids: updatedMemberIds })
        .eq('id', league.id);
      // Remove user's team
      await supabase
        .from('teams')
        .delete()
        .eq('league_id', league.id)
        .eq('user_id', user.id);
      // Remove user's lineups
      await supabase
        .from('lineups')
        .delete()
        .eq('league_id', league.id)
        .eq('user_id', user.id);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to leave league');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-600 text-xl">{error}</div>
      </div>
    )
  }

  if (!league) {
  return (
      <div className="text-center py-16">
        <div className="text-red-600 text-xl">League not found</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white min-h-screen p-4 lg:p-6">
      {/* League Header */}
      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 mb-6 lg:mb-8 border-2 border-gold">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2 lg:mb-0">{league?.name}</h1>
            {new Date(league?.end_date) < new Date() && (
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
              {league?.member_ids.length} members
            </div>
            <div className="text-xs lg:text-sm text-neutral-600">
              {league?.buy_in} coins buy-in
            </div>
          </div>
        </div>
        
        {league?.description && (
          <p className="text-neutral-600 mb-4 text-sm lg:text-base">{league?.description}</p>
        )}
        {/* Winner and payout display */}
        {new Date(league?.end_date) < new Date() && league?.payout_processed && payout && (
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
              Ends: {new Date(league?.end_date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Trophy className="h-4 w-4 lg:h-5 lg:w-5 text-gold" />
            <span className="text-xs lg:text-sm text-neutral-600">
              Join Code: {league?.join_code}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-gold" />
            <span className="text-xs lg:text-sm text-neutral-600">
              Draft: {league?.draft_completed ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* Bot Management Section - Only visible to league owner */}
      {isOwner && (
        <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 mb-6 lg:mb-8 border-2 border-royalBlue">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg lg:text-xl font-bold text-neutral-900 flex items-center">
              <BotIcon className="w-5 h-5 mr-2 text-royalBlue" />
              Bot Management
            </h2>
            {!bot && (
              <button
                type="button"
                onClick={() => setShowAddBotModal(true)}
                className="flex items-center space-x-1 bg-[#1e293b] hover:bg-royalBlue text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
                disabled={botLoading}
              >
                <Plus className="w-4 h-4" />
                <span>Add Bot</span>
              </button>
            )}
          </div>

          {bot ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-royalBlue">
                <div className="flex items-center space-x-3">
                  <BotIcon className="w-6 h-6 text-royalBlue" />
                  <div>
                    <h3 className="font-semibold text-neutral-900">{bot.name}</h3>
                    <p className="text-sm text-neutral-600">Auto-drafts highest ELO players</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveBot}
                  className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
                  disabled={botLoading}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              </div>

              {/* Bot actions during draft */}
              {draftStarted && !league.draft_completed && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Draft Actions</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    The bot will automatically draft the highest ELO player available when it's their turn.
                  </p>
                  <button
                    type="button"
                    onClick={handleBotDraft}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
                    disabled={botLoading}
                  >
                    {botLoading ? 'Processing...' : 'Force Bot Draft'}
                  </button>
                </div>
              )}

              {/* Bot actions for lineup */}
              {league.draft_completed && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Lineup Actions</h4>
                  <p className="text-sm text-green-700 mb-3">
                    The bot will automatically set a lineup with the 5 highest ELO players from their team.
                  </p>
                  <button
                    type="button"
                    onClick={handleBotSetLineup}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
                    disabled={botLoading}
                  >
                    {botLoading ? 'Processing...' : 'Set Bot Lineup'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <BotIcon className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
              <p className="text-neutral-600 text-sm lg:text-base mb-4">
                Add a bot to automatically draft the highest ELO players and set optimal lineups.
              </p>
              <button
                type="button"
                onClick={() => setShowAddBotModal(true)}
                className="flex items-center space-x-1 bg-[#1e293b] hover:bg-royalBlue text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-colors mx-auto"
                disabled={botLoading}
              >
                <Plus className="w-4 h-4" />
                <span>Add Bot</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 mb-4">
        {isOwner && (
          <button
            onClick={handleDeleteLeague}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold shadow-lg"
            disabled={loading}
          >
            Delete League
          </button>
        )}
        {!isOwner && user?.id && league?.member_ids?.includes(user.id) && (
          <button
            onClick={handleLeaveLeague}
            className="bg-neutral-300 hover:bg-neutral-400 text-neutral-900 px-4 py-2 rounded font-semibold shadow-lg"
            disabled={loading}
          >
            Leave League
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Standings */}
        <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold relative">
          {showConfetti && <Confetti className="pointer-events-none" style={{zIndex: 30}} />}
          <h2 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Standings</h2>
          {league?.draft_completed || (league?.end_date && new Date(league.end_date) < new Date()) ? (
            <div>
              {/* Podium for Top 3 */}
              <div className="flex justify-center items-end mb-8 gap-4">
                {/* 2nd Place */}
                {standings[1] && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-silver flex items-center justify-center text-2xl font-bold text-white border-4 border-silver mb-2">
                      2
                    </div>
                    <ExpandableUsername username={standings[1].display_name || standings[1].user_email} />
                    <span className="text-neutral-600 text-sm">{standings[1].total_points} pts</span>
                  </div>
                )}
                {/* 1st Place */}
                {standings[0] && (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-royalBlue flex items-center justify-center text-3xl font-extrabold text-white border-4 border-royalBlue mb-2 shadow-lg">
                      1
                    </div>
                    <ExpandableUsername username={standings[0].display_name || standings[0].user_email} />
                    <span className="text-neutral-900 font-bold text-base">{standings[0].total_points} pts</span>
                  </div>
                )}
                {/* 3rd Place */}
                {standings[2] && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-[#cd7f32] flex items-center justify-center text-2xl font-bold text-white border-4 border-[#cd7f32] mb-2">
                      3
                    </div>
                    <ExpandableUsername username={standings[2].display_name || standings[2].user_email} />
                    <span className="text-neutral-600 text-sm">{standings[2].total_points} pts</span>
                  </div>
                )}
              </div>
              {/* The rest of the players */}
              {standings.length > 3 && (
                <div className="mt-6">
                  <h3 className="text-base font-semibold mb-2 text-neutral-900">Other Players</h3>
                  <div className="space-y-2">
                    {standings.slice(3).map((standing) => (
                      <div
                        key={standing.user_id}
                        className="flex items-center justify-between p-2 rounded bg-neutral-50 border border-neutral-200"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-full bg-neutral-300 text-neutral-700 flex items-center justify-center font-bold text-xs">{standing.rank}</span>
                          <ExpandableUsername username={standing.display_name || standing.user_email} />
                        </div>
                        <span className="text-neutral-700 font-medium">{standing.total_points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
          <div className="space-y-3">
            {standings.map((standing, index) => (
              <div
                key={standing.user_id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
                    standing.user_id === user?.id ? 'bg-royalBlue bg-opacity-10 border border-royalBlue' : 'bg-neutral-50 hover:bg-neutral-100'
                }`}
                onClick={() => handleUserClick(standing)}
              >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-bold flex-shrink-0 ${
                      index < 3 ? 'bg-royalBlue text-white' : 'bg-neutral-300 text-neutral-700'
                  }`}>
                    {standing.rank}
                  </div>
                    <div className="min-w-0 flex-1">
                      <ExpandableUsername 
                        username={standing.display_name || standing.user_email}
                        isCurrentUser={standing.user_id === user?.id}
                      />
                  </div>
                </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-semibold text-sm lg:text-base text-neutral-900">{standing.total_points} points</p>
                </div>
              </div>
            ))}
          </div>
          )}
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
                    <ExpandablePlayerName 
                      playerName={player.name}
                      href={`https://www.chess.com/member/${player.name}/`}
                    />
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
                  className="flex items-center space-x-1 text-royalBlue hover:text-purple text-sm lg:text-base transition-colors"
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
                          ? 'border-royalBlue bg-royalBlue bg-opacity-10'
                          : 'border-neutral-200 hover:border-royalBlue'
                      }`}
                    >
                      <div className="font-medium text-sm lg:text-base text-neutral-900">
                        <ExpandablePlayerName playerName={player.name} />
                      </div>
                      <div className="text-xs lg:text-sm text-neutral-600">ELO: {player.elo}</div>
                    </button>
                  ))}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={saveLineup}
                    disabled={selectedLineupPlayers.length !== 5}
                    className="flex items-center space-x-1 bg-[#1e293b] hover:bg-royalBlue disabled:bg-neutral-400 text-white px-3 lg:px-4 py-2 rounded-lg text-sm lg:text-base shadow-lg transition-colors"
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
                    <ExpandablePlayerName 
                      playerName={player.name}
                      href={`https://www.chess.com/member/${player.name}/`}
                    />
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
                  className="ml-2 border border-neutral-300 rounded px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-royalBlue"
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
                      <td className="px-2 py-1 text-neutral-700">
                        <ExpandablePlayerName playerName={row.player_name} />
                      </td>
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
                  className="mb-4 px-6 py-2 bg-[#1e293b] hover:bg-royalBlue text-white rounded-lg font-semibold shadow-lg transition-colors"
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
                    className="mb-4 w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                  />
                  {isUserTurn() ? (
                    <div>
                      <p className="text-royalBlue font-medium mb-4 text-sm lg:text-base">It's your turn to draft!</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        {availablePlayers
                          .filter(player => player.name.toLowerCase().includes(search.toLowerCase()))
                          .map((player) => (
                            <button
                              type="button"
                              key={player.id}
                              onClick={() => draftPlayer(player.id)}
                              className="p-3 rounded-lg border border-neutral-200 hover:border-royalBlue text-left w-full transition-colors"
                            >
                              <div className="font-semibold text-base lg:text-lg text-neutral-900">
                                <ExpandablePlayerName 
                                  playerName={player.name}
                                  href={`https://www.chess.com/member/${player.name}/`}
                                  className="text-base lg:text-lg"
                                />
                              </div>
                              <div className="text-xs lg:text-sm text-neutral-600">ELO: {player.elo}</div>
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 lg:py-8">
                      {league.current_draft_turn >= league.draft_order.length ? (
                        <p className="text-royalBlue text-sm lg:text-base font-semibold">Draft complete!</p>
                      ) : (
                        (() => {
                          const currentDraftUserId = league.draft_order[league.current_draft_turn];
                          
                          // Check if it's the bot's turn
                          if (currentDraftUserId === bot?.id) {
                            return (
                              <div className="space-y-2">
                                <p className="text-blue-600 text-sm lg:text-base font-medium">
                                  🤖 {bot.name} is drafting...
                                </p>
                                <p className="text-neutral-500 text-xs">Bot will automatically select the highest ELO player</p>
                              </div>
                            );
                          }
                          
                          const displayName = userMap[currentDraftUserId] || 'Unknown Player';
                          
                          return (
                            <p className="text-neutral-600 text-sm lg:text-base">
                              Waiting for <span className="inline-block"><ExpandableUsername username={displayName} /></span> to draft...
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
                  <ExpandableUsername 
                    username={selectedUser.display_name || selectedUser.user_email}
                    isCurrentUser={selectedUser.user_id === user?.id}
                    className="text-xl font-bold"
                  />
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
                        <ExpandablePlayerName 
                          playerName={player.name}
                          href={`https://www.chess.com/member/${player.name}/`}
                          className="text-sm"
                        />
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
                      <div key={player.id} className="bg-royalBlue bg-opacity-10 rounded-lg p-3 text-center border border-royalBlue">
                        <ExpandablePlayerName 
                          playerName={player.name}
                          href={`https://www.chess.com/member/${player.name}/`}
                          className="text-sm"
                        />
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

      {/* Add Bot Modal */}
      {showAddBotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border-2 border-royalBlue">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900 flex items-center">
                  <BotIcon className="w-5 h-5 mr-2 text-royalBlue" />
                  Add Bot
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBotModal(false)
                    setBotName('')
                    setBotNameError('')
                  }}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="botName" className="block text-sm font-medium text-neutral-900 mb-2">
                    Bot Name
                  </label>
                  <input
                    type="text"
                    id="botName"
                    value={botName}
                    onChange={(e) => {
                      setBotName(e.target.value)
                      setBotNameError('')
                    }}
                    placeholder="Enter bot name..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    disabled={botLoading}
                  />
                  {botNameError && (
                    <p className="text-red-600 text-sm mt-1">{botNameError}</p>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">Bot Behavior</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Automatically drafts the highest ELO player available</li>
                    <li>• Sets lineups with the 5 highest ELO players from their team</li>
                    <li>• Only one bot allowed per league</li>
                    <li>• Can be removed at any time by the league owner</li>
                  </ul>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleAddBot}
                    className="flex-1 bg-[#1e293b] hover:bg-royalBlue text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-colors"
                    disabled={botLoading || !botName.trim()}
                  >
                    {botLoading ? 'Creating...' : 'Add Bot'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBotModal(false)
                      setBotName('')
                      setBotNameError('')
                    }}
                    className="flex-1 bg-neutral-600 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-colors"
                    disabled={botLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaguePage 
