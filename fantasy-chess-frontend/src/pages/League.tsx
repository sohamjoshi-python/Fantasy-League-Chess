import * as React from 'react'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League, Lineup, ChessPlayer, Bot } from '../types'
import { Crown, Trophy, Calendar, Edit, Check, X, RefreshCw, Bot as BotIcon, Plus, Trash2 } from 'lucide-react'
import { createBot, removeBot, autoSetLineupForBot } from '../lib/supabase';
import Confetti from 'react-confetti';
import fantasyLeagueChessLogo from '../assets/fantasy-league-chess-logo-updated.png';

import Marketplace from '../components/Marketplace';
import TurnBasedMarketplace from '../components/TurnBasedMarketplace';
import DiscordIntegration from '../components/DiscordIntegration';
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
    <span
      className={`relative align-baseline ${className}`}
      style={{ maxWidth, verticalAlign: "baseline" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="truncate overflow-hidden whitespace-nowrap font-medium text-sm lg:text-base text-neutral-900"
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
    </span>
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
    // For each team, fill up to 1 player (minimum needed to start)
    for (const team of teams || []) {
      const current = team.player_ids || [];
      const needed = 1 - current.length;
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
    // After all teams have at least 1 player, mark draft as completed
    await supabase
      .from('leagues')
      .update({ draft_completed: true })
      .eq('id', leagueData.id);
    // Reload league data to reflect changes
    // await loadLeagueData(); // This line was removed as per the edit hint
  }
};

// Helper function to generate snake draft order
const generateSnakeDraftOrder = (participants: string[], rounds: number): string[] => {
  const draftOrder: string[] = [];
  
  for (let round = 0; round < rounds; round++) {
    if (round % 2 === 0) {
      // Forward order (1, 2, 3, 4...)
      for (let i = 0; i < participants.length; i++) {
        draftOrder.push(participants[i]);
      }
    } else {
      // Reverse order (4, 3, 2, 1...)
      for (let i = participants.length - 1; i >= 0; i--) {
        draftOrder.push(participants[i]);
      }
    }
  }
  
  return draftOrder;
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
  const [teamPlayers, setTeamPlayers] = useState<ChessPlayer[]>([])
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
  const [userMap, setUserMap] = useState<{ [id: string]: string }>({})

  // User popup state
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showUserPopup, setShowUserPopup] = useState(false)
  const [selectedUserTeam, setSelectedUserTeam] = useState<ChessPlayer[]>([])
  const [selectedUserLineup, setSelectedUserLineup] = useState<ChessPlayer[]>([])

  const [playerBreakdown, setPlayerBreakdown] = useState<{ 
    early: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }>, 
    late: Array<{ player_id: string, player_name: string, player_points: number, wins?: number, total_games?: number }> 
  }>({ early: [], late: [] });
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [payout, setPayout] = useState<any | null>(null);
  const [winnerName, setWinnerName] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);

  const [bot, setBot] = useState<Bot | null>(null)
  const [botLoading, setBotLoading] = useState(false)
  const [showAddBotModal, setShowAddBotModal] = useState(false)
  const [botName, setBotName] = useState('')
  const [botNameError, setBotNameError] = useState('')

  useEffect(() => {
    async function fetchAvailableWeeks() {
      if (!league || !user) return;
      // TEMPORARILY DISABLED - Fix lineups table structure
      /*
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
      */
      // Temporary fix - set default week
      setAvailableWeeks(['2025.07.21']);
      setSelectedWeek('2025.07.21');
    }
    fetchAvailableWeeks();
  }, [league, user]);

  useEffect(() => {
    async function loadBreakdown() {
      if (!user || !league || !selectedWeek) return;
      setBreakdownLoading(true);
      setBreakdownError('');
      try {
        // TEMPORARILY DISABLED - Fix function later
        /*
        const data = await fetchLineupPlayerBreakdownByRounds(user.id, league?.id, selectedWeek.replace(/\./g, '-'));
        setPlayerBreakdown(data);
        */
        setPlayerBreakdown({ early: [], late: [] }); // Empty object with correct structure
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
      let teamData = null;
      try {
        const { data: teamResult, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', user.id)
          .eq('league_id', leagueId)
          .maybeSingle(); // Use maybeSingle instead of single to handle no results
        teamData = teamResult;
      } catch (error) {
        console.log('Teams query failed (continuing without team data):', error);
        teamData = null;
      }

      if (teamData) {
        try {
          // Get team players
          const { data: players } = await supabase
            .from('chess_players')
            .select('*')
            .in('id', teamData.player_ids)

          if (players) {
            setTeamPlayers(players)
          }
        } catch (error) {
          console.log('Team players query failed:', error);
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


        }
      }

      // Get current lineup
      const currentWeek = getCurrentWeekStart()
      const { data: lineupData, error: lineupError } = await supabase
        .from('lineups')
        .select('*')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .eq('week_start_date', currentWeek)
        .maybeSingle() // Use maybeSingle instead of single to handle no results

      if (lineupData && !lineupError) {
        setCurrentLineup(lineupData)
        setSelectedLineupPlayers(lineupData.player_ids)

        // Get lineup players
        const { data: lineupPlayers } = await supabase
          .from('chess_players')
          .select('*')
          .in('id', lineupData.player_ids)

        if (lineupPlayers) {
          setLineupPlayers(lineupPlayers)
        }
      } else {
        // No lineup exists for this week, that's okay
        setCurrentLineup(null)
        setSelectedLineupPlayers([])
        setLineupPlayers([])
      }

      // Load bot data if league has a bot
      // Note: bot_id column doesn't exist, so we'll check for bots by league_id
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('*')
        .eq('league_id', leagueId)
        .maybeSingle() // Use maybeSingle instead of single to handle no results
      
      if (!botError && botData) {
        setBot(botData)
      }

      // Load standings (after bot is loaded)
      await loadStandings(leagueId, botData) // Pass botData directly

    } catch (error) {
      console.error('Error loading league data:', error)
      setError('Failed to load league data')
    } finally {
      setLoading(false)
    }
  }

  const loadStandings = async (leagueId: string, botData?: Bot) => {
    try {
      // Get league data with member_ids and creator_id
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('member_ids, creator_id')
        .eq('id', leagueId)
        .single()

      if (!leagueData) return

      // Get all unique user IDs (creator + members)
      const allUserIds = new Set([
        leagueData.creator_id,
        ...(leagueData.member_ids || [])
      ])

      // Get user details from users table
      const { data: userDetails } = await supabase
        .from('users')
        .select('id, username, selected_avatar_url')
        .in('id', Array.from(allUserIds))

      // Create a map of user details
      const userMap = userDetails ? Object.fromEntries(
        userDetails.map(u => [u.id, {
          username: u.username || `User_${u.id.slice(0, 6)}`,
          avatar_url: u.selected_avatar_url || fantasyLeagueChessLogo
        }])
      ) : {}

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
            userPoints.set(lineup.user_id, current + (lineup.total_points || 0))
          }
        })
      }

      // Create standings data for all members (excluding bots)
      const standingsData = Array.from(allUserIds)
        .filter(userId => {
          // Filter out bots - they will be added separately
          // Check if this user ID matches the bot ID
          return !botData || userId !== botData.id
        })
        .map(userId => {
          // Double-check this isn't a bot
          if (botData && userId === botData.id) {
            console.log('Bot ID found in regular users, skipping:', userId)
            return null
          }
          return {
            user_id: userId,
            display_name: userMap[userId]?.username || 'Unknown User',
            total_points: userPoints.get(userId) || 0,
            rank: 0,
            avatar_url: userMap[userId]?.avatar_url || fantasyLeagueChessLogo,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null) // Type-safe filter

      // Add bot to standings if it exists
      if (botData) {
        console.log('Adding bot to standings:', botData)
        // Sum up all lineups for this bot by bot_id
        let botPoints = 0
        if (lineups) {
          botPoints = lineups
            .filter(lineup => lineup.bot_id === botData.id)
            .reduce((sum, lineup) => sum + (lineup.total_points || 0), 0)
        }
        standingsData.push({
          user_id: botData.id,
          display_name: `${botData.name} 🤖`, // Use bot.name from the bots table
          total_points: botPoints,
          rank: 0,
          avatar_url: fantasyLeagueChessLogo,
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

  const saveLineup = async () => {
    if (!league || !user || selectedLineupPlayers.length < 1 || selectedLineupPlayers.length > 5) return

    // Prevent duplicate player IDs in the lineup
    const uniquePlayerIds = Array.from(new Set(selectedLineupPlayers));
    if (uniquePlayerIds.length !== selectedLineupPlayers.length) {
      setError('You cannot select the same player more than once in your lineup.');
      return;
    }

    try {
      setLoading(true)

      const currentWeek = getCurrentWeekStart()
      // Delete any existing lineup for this user/league/week
      await supabase
        .from('lineups')
        .delete()
        .match({
          user_id: user.id,
          league_id: league.id,
          week_start_date: currentWeek
        });

      // Now insert the new lineup
      const { error: insertError } = await supabase
        .from('lineups')
        .insert([
          {
            user_id: user.id,
            league_id: league.id,
            week_start_date: currentWeek,
            player_ids: uniquePlayerIds,
            total_points: 0
          }
        ]);
      if (insertError) {
        setError(insertError.message || 'Failed to insert lineup');
        return;
      }

      setIsEditingLineup(false)
      await loadLeagueData()
    } catch (error: any) {
      // Show a clear error message if available
      setError(error?.message || error?.toString() || 'Failed to save lineup')
      console.error('Error saving lineup:', error)
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
        
        // Update the league with bot information
        await supabase
          .from('leagues')
          .update({ 
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
        
        // Update league to remove bot from member_ids, and regenerate draft order
        const updatedMemberIds = (league.member_ids || []).filter((id: string) => id !== bot.id);
        const updatedDraftOrder = generateSnakeDraftOrder(updatedMemberIds, 10)
        
        // Update the league to remove bot information
        await supabase
          .from('leagues')
          .update({ 
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

      // Check if this is a bot by checking if userData.user_id matches bot.id
      const isBot = bot && userData.user_id === bot.id;

      // Get user's team
      let teamData = null;
      if (isBot) {
        // Fetch bot's team by bot_id
        const { data } = await supabase
          .from('teams')
          .select('*')
          .eq('bot_id', bot.id)
          .eq('league_id', leagueId!)
          .maybeSingle(); // Use maybeSingle instead of single
        teamData = data;
      } else {
        // Fetch user's team by user_id
        const { data } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', userData.user_id)
          .eq('league_id', leagueId!)
          .maybeSingle(); // Use maybeSingle instead of single
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
      try {
        if (isBot) {
          const { data } = await supabase
            .from('lineups')
            .select('*')
            .eq('bot_id', bot.id)
            .eq('league_id', leagueId!)
            .eq('week_start_date', currentWeek)
            .maybeSingle(); // Use maybeSingle instead of single
          lineupData = data;
        } else {
          const { data } = await supabase
            .from('lineups')
            .select('*')
            .eq('user_id', userData.user_id)
            .eq('league_id', leagueId!)
            .eq('week_start_date', currentWeek)
            .maybeSingle(); // Use maybeSingle instead of single
          lineupData = data;
        }
      } catch (error) {
        console.log('Lineups query failed (continuing without lineup data):', error);
        lineupData = null;
      }

      if (lineupData) {
        try {
          const { data: lineupPlayers } = await supabase
            .from('chess_players')
            .select('*')
            .in('id', lineupData.player_ids)

          setSelectedUserLineup(lineupPlayers || [])
        } catch (error) {
          console.log('Lineup players query failed:', error);
          setSelectedUserLineup([]);
        }
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
      // Get usernames from users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username')
        .in('id', ids);
      
      if (userData && !error && userData.length > 0) {
        const map: { [id: string]: string } = {};
        userData.forEach((user) => {
          // Always use the username field from users table
          const username = user.username || 'Unknown User';
          map[user.id] = username;
        });
        
        setUserMap(map);
      } else {
        // Fallback: create a simple map with user IDs
        const fallbackMap: { [id: string]: string } = {};
        ids.forEach(id => {
          fallbackMap[id] = `User_${id.slice(0, 6)}`;
        });
        
        setUserMap(fallbackMap);
      }
    } catch (err) {
      console.error('Error in fetchUserMap:', err);
      // Fallback: create a simple map with user IDs
      const fallbackMap: { [id: string]: string } = {};
      ids.forEach(id => {
        fallbackMap[id] = `User_${id.slice(0, 6)}`;
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
          .maybeSingle(); // Use maybeSingle instead of single
        setPayout(payoutData);
        if (payoutData) {
          // Try to get display name from userMap or fallback to user_id
          let displayName = '';
          if (userMap[payoutData.user_id]) {
            displayName = userMap[payoutData.user_id];
          } else {
            // Fetch from users table
            const { data: user } = await supabase
              .from('users')
              .select('username')
              .eq('id', payoutData.user_id)
              .maybeSingle(); // Use maybeSingle instead of single
            displayName = user?.username || payoutData.user_id;
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
    if (league?.end_date && new Date(league.end_date) < new Date() && league?.payout_processed && payout) {
      setShowConfetti(true);
      const timeout = setTimeout(() => setShowConfetti(false), 8000); // 8 seconds for all confetti to fall
      return () => clearTimeout(timeout);
    } else {
      setShowConfetti(false);
    }
  }, [league?.end_date, league?.payout_processed, payout]);

  // Delete league (admin only)
  const handleDeleteLeague = async () => {
    if (!league || !isOwner) return;
    if (!window.confirm('Are you sure you want to delete this league? This cannot be undone.')) return;
    setLoading(true);
    try {
      console.log('Starting league deletion for league:', league.id);
      console.log('Current user:', user?.id);
      console.log('Is owner:', isOwner);
      console.log('League object:', league);
      
      // Try the clean function first (removes all triggers)
      console.log('Attempting to call delete_league_clean function...');
      console.log('Parameter being passed:', { league_uuid: league.id });
      
      const { error: rpcError, data: rpcData } = await supabase.rpc('delete_league_clean', {
        league_uuid: league.id
      });
      
      console.log('RPC call result:', { error: rpcError, data: rpcData });
      
      if (rpcError) {
        console.log('Clean function failed, trying direct function:', rpcError);
        
        // Try the direct function as fallback
        const { error: directRpcError, data: directRpcData } = await supabase.rpc('delete_league_direct', {
          league_uuid: league.id
        });
        
        console.log('Direct function result:', { error: directRpcError, data: directRpcData });
        
        if (directRpcError) {
          console.log('Direct function also failed:', directRpcError);
          
          // Try the RLS restore function
          const { error: rlsRpcError, data: rlsRpcData } = await supabase.rpc('delete_league_and_restore_rls', {
            league_uuid: league.id
          });
          
          console.log('RLS restore function result:', { error: rlsRpcError, data: rlsRpcData });
          
          if (rlsRpcError) {
            console.log('RLS restore function also failed:', rlsRpcError);
            
            // Final fallback: try manual deletion
            console.log('Trying manual deletion...');
            
            const leagueId = league.id;
            
            // Try to delete everything manually
            const deletions = [
              { table: 'marketplace_turns' as const },
              { table: 'lineups' as const },
              { table: 'teams' as const },
              { table: 'league_members' as const },
              { table: 'bots' as const },
              { table: 'league_coin_balances' as const },
              { table: 'leagues' as const }
            ];
            
            for (const deletion of deletions) {
              const { error } = await supabase
                .from(deletion.table)
                .delete()
                .eq(deletion.table === 'leagues' ? 'id' : 'league_id', 
                    deletion.table === 'leagues' ? leagueId : leagueId);
              
              console.log(`${deletion.table} deletion result:`, error);
              
              if (error) {
                console.error(`Failed to delete from ${deletion.table}:`, error);
              }
            }
            
            // Check if league was actually deleted
            const { data: remainingLeague } = await supabase
              .from('leagues')
              .select('id')
              .eq('id', leagueId);
            
            if (remainingLeague && remainingLeague.length > 0) {
              throw new Error('League still exists after deletion attempts');
            }
          }
        }
      }
      
      console.log('League deletion completed successfully');
      navigate('/dashboard');
    } catch (err) {
      console.error('Delete league error:', err);
      setError('Failed to delete league: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Leave league (for non-owners)
  const handleLeaveLeague = async () => {
    if (!league || !user || isOwner) return;
    if (!user.id) return;
    if (!window.confirm('Are you sure you want to leave this league?')) return;
    await removeUserFromLeague(user.id);
  };

  // Remove user from league (for creators or self)
  const removeUserFromLeague = async (userIdToRemove: string) => {
    if (!league || !user) return;
    if (!user.id) return;
    
    // Only allow if user is the creator or removing themselves
    if (!isOwner && user.id !== userIdToRemove) return;
    
    const confirmMessage = user.id === userIdToRemove 
      ? 'Are you sure you want to leave this league?' 
      : 'Are you sure you want to remove this player from the league?';
    
    if (!window.confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      // First, update the league's member_ids (while user is still a member)
      const updatedMemberIds = (league.member_ids || []).reduce((acc: string[], id: string | undefined) => {
        if (typeof id === 'string' && id !== userIdToRemove) acc.push(id);
        return acc;
      }, []);
      const { error: leaguesError } = await supabase
        .from('leagues')
        .update({ member_ids: updatedMemberIds })
        .eq('id', league.id);
      if (leaguesError) {
        console.error('Error updating leagues.member_ids:', leaguesError);
        setError('Failed to update league members: ' + leaguesError.message);
        setLoading(false);
        return;
      }
      
      // Then remove from league_members
      const { error: leagueMembersError } = await supabase
        .from('league_members')
        .delete()
        .eq('league_id', league.id)
        .eq('user_id', userIdToRemove);
      if (leagueMembersError) {
        console.error('Error removing from league_members:', leagueMembersError);
        setError('Failed to remove from league_members: ' + leagueMembersError.message);
        setLoading(false);
        return;
      }
      
      // Remove user's team
      const { error: teamsError } = await supabase
        .from('teams')
        .delete()
        .eq('league_id', league.id)
        .eq('user_id', userIdToRemove);
      if (teamsError) {
        console.error('Error deleting team:', teamsError);
        setError('Failed to delete team: ' + teamsError.message);
        setLoading(false);
        return;
      }
      
      // Remove user's lineups
      const { error: lineupsError } = await supabase
        .from('lineups')
        .delete()
        .eq('league_id', league.id)
        .eq('user_id', userIdToRemove);
      if (lineupsError) {
        console.error('Error deleting lineups:', lineupsError);
        setError('Failed to delete lineups: ' + lineupsError.message);
        setLoading(false);
        return;
      }
      
      // If user removed themselves, navigate to dashboard
      if (user.id === userIdToRemove) {
        navigate('/dashboard');
      } else {
        // If creator removed someone, reload league data
        await loadLeagueData();
      }
    } catch (err) {
      console.error('Unexpected error in removeUserFromLeague:', err);
      setError('Unexpected error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if lineup changes are allowed (not Tuesday UTC)
  function isLineupChangeAllowed() {
    // TEMPORARILY DISABLED: Always allow lineup changes
    return true;
    
    // Original logic (commented out for now):
    // const now = new Date();
    // const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // return day !== 2; // Disallow Tuesday (2)
  }

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
    <>
      {error && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white border border-red-300 rounded-lg shadow-lg p-6 max-w-sm w-full text-center z-50">
            <p className="text-red-700 font-semibold mb-4">{error}</p>
            <button
              className="bg-royalBlue text-white px-4 py-2 rounded"
              onClick={() => setError('')}
            >
              Close
            </button>
          </div>
          <div className="fixed inset-0 bg-black opacity-30 z-40"></div>
        </div>
      )}
      <div className="main-content">
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
                  Starts: {new Date(league?.start_date).toLocaleDateString()}
                  <span className="relative group cursor-pointer ml-1">
                    <svg className="w-3 h-3 text-royalBlue inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white text-neutral-900 text-xs rounded shadow-lg border border-royalBlue px-3 py-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      The start date is when the league begins and points start accumulating. The draft must be completed before this date.
                    </span>
                  </span>
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

          {/* Bot Management Section - Only visible to league owner and before draft starts */}
          {isOwner && !league?.draft_started && !league?.draft_completed && !league?.marketplace_started && (
            <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 mb-6 lg:mb-8 border-2 border-royalBlue">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg lg:text-xl font-bold text-neutral-900 flex items-center">
                  <BotIcon className="w-5 h-5 mr-2 text-royalBlue" />
                  Bot Management
                </h2>
                {!bot && league && new Date(league.end_date) >= new Date() && (
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

                  {/* Bot actions for marketplace and lineup */}
                  {league.marketplace_completed && (
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
                  {league && new Date(league.end_date) < new Date() ? (
                    <p className="text-neutral-600 text-sm lg:text-base mb-4">
                      This league has ended. Bots cannot be added to completed leagues.
                    </p>
                  ) : (
                    <>
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
                    </>
                  )}
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
              {league?.end_date && new Date(league.end_date) < new Date() && league?.payout_processed && payout ? (
                <>
                  {showConfetti && <Confetti className="pointer-events-none" style={{zIndex: 30}} />}
                  {/* Podium for Top 3 */}
                  <div className="flex justify-center items-end mb-8 gap-4">
                    {/* 2nd Place */}
                    {standings[1] && (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-silver flex items-center justify-center text-2xl font-bold text-white border-4 border-silver mb-2">2</div>
                        <div className="flex items-center gap-2">
                          <img src={standings[1].avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-gold" />
                          <ExpandableUsername username={standings[1].display_name} />
                        </div>
                        <span className="text-neutral-600 text-sm">{standings[1].total_points} pts</span>
                      </div>
                    )}
                    {/* 1st Place */}
                    {standings[0] && (
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-royalBlue flex items-center justify-center text-3xl font-extrabold text-white border-4 border-royalBlue mb-2 shadow-lg">1</div>
                        <div className="flex items-center gap-2">
                          <img src={standings[0].avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-gold" />
                          <ExpandableUsername username={standings[0].display_name} />
                        </div>
                        <span className="text-neutral-900 font-bold text-base">{standings[0].total_points} pts</span>
                      </div>
                    )}
                    {/* 3rd Place */}
                    {standings[2] && (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-[#cd7f32] flex items-center justify-center text-2xl font-bold text-white border-4 border-[#cd7f32] mb-2">3</div>
                        <div className="flex items-center gap-2">
                          <img src={standings[2].avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-gold" />
                          <ExpandableUsername username={standings[2].display_name} />
                        </div>
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
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-bold flex-shrink-0 ${
                                standing.user_id === user?.id ? 'bg-royalBlue text-white' : 'bg-neutral-300 text-neutral-700'
                              }`}>
                                {standing.rank}
                              </div>
                              <img src={standing.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-gold" />
                              <div className="min-w-0 flex-1">
                                <ExpandableUsername 
                                  username={standing.display_name}
                                  isCurrentUser={standing.user_id === user?.id}
                                />
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                              <p className="font-semibold text-sm lg:text-base text-neutral-900">{standing.total_points} points</p>
                              {isOwner && standing.user_id !== user?.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeUserFromLeague(standing.user_id);
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                                  title="Remove player from league"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  {standings.map((standing) => (
                    <div
                      key={standing.user_id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
                        standing.user_id === user?.id ? 'bg-royalBlue bg-opacity-10 border border-royalBlue' : 'bg-neutral-50 hover:bg-neutral-100'
                      }`}
                      onClick={() => handleUserClick(standing)}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-bold flex-shrink-0 ${
                          standing.user_id === user?.id ? 'bg-royalBlue text-white' : 'bg-neutral-300 text-neutral-700'
                        }`}>
                          {standing.rank}
                        </div>
                        <img src={standing.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-gold" />
                        <div className="min-w-0 flex-1">
                          <ExpandableUsername 
                            username={standing.display_name}
                            isCurrentUser={standing.user_id === user?.id}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        <p className="font-semibold text-sm lg:text-base text-neutral-900">{standing.total_points} points</p>
                        {isOwner && standing.user_id !== user?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUserFromLeague(standing.user_id);
                            }}
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                            title="Remove player from league"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {teamPlayers.map((player) => (
                      <div key={player.id} className="bg-neutral-50 rounded-lg p-4 text-center border border-gold min-h-[80px] flex flex-col justify-center">
                        <ExpandablePlayerName 
                          playerName={player.name}
                          href={`https://www.chess.com/member/${player.name}/`}
                          className="text-sm font-medium mb-1"
                        />
                        <div className="text-xs text-neutral-600">ELO: {player.elo}</div>
                        {(player.average_centipawn_loss !== undefined && player.average_centipawn_loss !== null) ? (
                          <div className="text-xs text-neutral-500">ACL: {player.average_centipawn_loss.toFixed(2)}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Lineup */}
              <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg lg:text-xl font-bold text-neutral-900">Current Lineup</h3>
                  {teamPlayers.length >= 1 && !isEditingLineup && (
                    <button
                      type="button"
                      onClick={() => {
                        // Temporarily disabled Tuesday restriction
                        // if (!isLineupChangeAllowed()) {
                        //   setError('You cannot edit your lineup on Tuesday (UTC). Please try again on another day.');
                        //   return;
                        // }
                        setIsEditingLineup(true);
                      }}
                      className="flex items-center space-x-1 text-royalBlue hover:text-purple text-sm lg:text-base transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {isEditingLineup ? (
                  isLineupChangeAllowed() ? (
                    <div className="space-y-4">
                      <p className="text-xs lg:text-sm text-neutral-600">Select 1-5 players for your lineup:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                            className={`p-4 rounded-lg border-2 text-left transition-colors min-h-[80px] flex flex-col justify-center ${
                              selectedLineupPlayers.includes(player.id)
                                ? 'border-royalBlue bg-royalBlue bg-opacity-10'
                                : 'border-neutral-200 hover:border-royalBlue'
                            }`}
                          >
                            <div className="font-medium text-sm lg:text-base text-neutral-900 mb-1">
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
                          disabled={selectedLineupPlayers.length < 1 || selectedLineupPlayers.length > 5}
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
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-center">
                      <p className="font-semibold">Lineup changes are only allowed on Monday and Tuesday (UTC).</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingLineup(false)
                          setSelectedLineupPlayers(currentLineup?.player_ids || [])
                        }}
                        className="flex items-center space-x-1 bg-neutral-600 hover:bg-neutral-700 text-white px-3 lg:px-4 py-2 rounded-lg text-sm lg:text-base shadow-lg transition-colors mt-4"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {lineupPlayers.map((player) => (
                      <div key={player.id} className="bg-neutral-50 rounded-lg p-4 text-center border border-gold min-h-[80px] flex flex-col justify-center">
                        <ExpandablePlayerName 
                          playerName={player.name}
                          href={`https://www.chess.com/member/${player.name}/`}
                          className="text-sm font-medium mb-1"
                        />
                        <div className="text-xs text-neutral-600">ELO: {player.elo}</div>
                        {(player.average_centipawn_loss !== undefined && player.average_centipawn_loss !== null) ? (
                          <div className="text-xs text-neutral-500">ACL: {player.average_centipawn_loss.toFixed(2)}</div>
                        ) : null}
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
                ) : (playerBreakdown && (playerBreakdown.early?.length > 0 || playerBreakdown.late?.length > 0)) ? (
                  <div className="space-y-6">
                    {/* Early Round */}
                    {playerBreakdown?.early?.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-3 text-neutral-900">Early Round</h4>
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left px-2 py-1 text-neutral-900">Player</th>
                              <th className="text-center px-2 py-1 text-neutral-900">Record</th>
                              <th className="text-right px-2 py-1 text-neutral-900">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {playerBreakdown.early.map((row) => (
                              <tr key={row.player_id || row.player_name}>
                                <td className="px-2 py-1 text-neutral-700">
                                  <ExpandablePlayerName playerName={row.player_name} />
                                </td>
                                <td className="px-2 py-1 text-center text-neutral-700">
                                  {row.wins !== undefined && row.total_games !== undefined 
                                    ? `${row.wins}/${row.total_games}`
                                    : '-'
                                  }
                                </td>
                                <td className="px-2 py-1 text-right text-neutral-700">{Number(row.player_points).toFixed(2)}</td>
                              </tr>
                            ))}
                            <tr className="font-bold border-t border-neutral-300">
                              <td className="px-2 py-1 text-neutral-900">TOTAL</td>
                              <td className="px-2 py-1 text-center">-</td>
                              <td className="px-2 py-1 text-right text-neutral-900">{playerBreakdown.early.reduce((sum, p) => sum + Number(p.player_points), 0).toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Late Round */}
                    {playerBreakdown?.late?.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-3 text-neutral-900">Late Round</h4>
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left px-2 py-1 text-neutral-900">Player</th>
                              <th className="text-center px-2 py-1 text-neutral-900">Record</th>
                              <th className="text-right px-2 py-1 text-neutral-900">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {playerBreakdown.late.map((row) => (
                              <tr key={row.player_id || row.player_name}>
                                <td className="px-2 py-1 text-neutral-700">
                                  <ExpandablePlayerName playerName={row.player_name} />
                                </td>
                                <td className="px-2 py-1 text-center text-neutral-700">
                                  {row.wins !== undefined && row.total_games !== undefined 
                                    ? `${row.wins}/${row.total_games}` 
                                    : '-'
                                  }
                                </td>
                                <td className="px-2 py-1 text-right text-neutral-700">{Number(row.player_points).toFixed(2)}</td>
                              </tr>
                            ))}
                            <tr className="font-bold border-t border-neutral-300">
                              <td className="px-2 py-1 text-neutral-900">TOTAL</td>
                              <td className="px-2 py-1 text-center">-</td>
                              <td className="px-2 py-1 text-right text-neutral-900">{playerBreakdown.late.reduce((sum, p) => sum + Number(p.player_points), 0).toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Combined Total */}
                    <div className="bg-neutral-50 rounded-lg p-4 border border-gold">
                      <h4 className="text-lg font-semibold mb-2 text-neutral-900">Week Total</h4>
                      <p className="text-2xl font-bold text-gold">
                        {(playerBreakdown.early.reduce((sum, p) => sum + Number(p.player_points), 0) + 
                          playerBreakdown.late.reduce((sum, p) => sum + Number(p.player_points), 0)).toFixed(2)} points
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-neutral-600">No breakdown available for this week.</div>
                )}
              </div>

              {/* Turn-Based Marketplace Section */}
              {!league.draft_completed && !league.marketplace_completed && (
                <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
                  <TurnBasedMarketplace league={league} onUpdate={loadLeagueData} />
                </div>
              )}
            </div>
          </div>

          {/* Discord Integration - Above Marketplace */}
          {league && (
            <div className="mt-8">
              <DiscordIntegration 
                discordInviteLink={league.discord_invite_link}
                leagueName={league.name}
              />
            </div>
          )}

          {/* Coin Marketplace - Show after draft is completed */}
          {league && (league.draft_completed || league.marketplace_completed || (league.marketplace_order && league.marketplace_order.length === 0)) && (
            <div className="mt-8 w-full">
              <Marketplace leagueId={leagueId!} />
            </div>
          )}

          {/* User Popup Modal */}
          {showUserPopup && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gold">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-neutral-900">
                      <ExpandableUsername 
                        username={selectedUser.display_name || `User_${selectedUser.user_id.slice(0, 6)}`}
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
                            {(player.average_centipawn_loss !== undefined && player.average_centipawn_loss !== null) ? (
                              <div className="text-xs text-neutral-500">ACL: {player.average_centipawn_loss.toFixed(2)}</div>
                            ) : null}
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
      </div>
    </>
  )
}

export default LeaguePage