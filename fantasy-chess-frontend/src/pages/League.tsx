import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League, Lineup, ChessPlayer, Bot } from '../types'
import { addDaysToYmd, getWeekStartMonday, leagueSeasonHasEndedLocal } from '../lib/calendarDate'
import {
  formatCalendarDate,
  getTeamBuildingStatusLabel,
  isCoinMarketplaceAvailable,
  isMarketplaceAutoStartDue,
  isTeamBuildingComplete,
  leagueSeasonHasStartedLocal,
} from '../lib/leagueStatus'
import { notifyMarketplaceStartedIfNeeded } from '../lib/marketplaceTurnEmail'
import { isLineupChangeAllowed, lineupChangeBlockedMessage } from '../lib/lineupWindow'
import { Crown, Trophy, Calendar, Edit, Check, X, RefreshCw, Bot as BotIcon, Plus, Trash2 } from 'lucide-react'
import {
  createBot,
  removeBot,
  autoSetLineupForBot,
  fetchLineupPlayerBreakdownByRounds,
  fetchUserLeagueDisplayWeeks,
  fetchLineupParticipantBreakdownByRounds,
  fetchLineupParticipantDisplayWeeks,
} from '../lib/supabase';
import Confetti from 'react-confetti';
import { resolveAvatarUrl } from '../lib/avatars';

import Marketplace from '../components/Marketplace';
import TurnBasedMarketplace from '../components/TurnBasedMarketplace';
import PlayerDetailModal from '../components/PlayerDetailModal';

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

const orderParticipantsWithBotsLast = async (participants: string[]): Promise<string[]> => {
  const uniqueParticipants = Array.from(new Set(participants));
  if (uniqueParticipants.length === 0) return [];

  const { data: bots } = await supabase
    .from('bots')
    .select('id')
    .in('id', uniqueParticipants);

  const botIds = new Set((bots || []).map(bot => bot.id));
  return [
    ...uniqueParticipants.filter(id => !botIds.has(id)),
    ...uniqueParticipants.filter(id => botIds.has(id)),
  ];
};

type PlayerBreakdownRow = {
  player_id: string
  player_name: string
  player_points: number
  wins?: number
  total_games?: number
}

type RoundBreakdown = {
  early: PlayerBreakdownRow[]
  late: PlayerBreakdownRow[]
}

type StandingDisplayRow = {
  user_id: string
  rank: number
  display_name: string
  avatar_url?: string
  total_points: number
  coin_delta?: number
}

const FinalPodiumCard: React.FC<{
  standing: StandingDisplayRow
  place: 1 | 2 | 3
  featured?: boolean
  isCurrentUser?: boolean
  onSelect: () => void
}> = ({ standing, place, featured = false, isCurrentUser = false, onSelect }) => {
  const placeStyles = {
    1: {
      card: 'border-royalBlue bg-gradient-to-b from-blue-50 to-white shadow-xl',
      badge: 'bg-royalBlue text-white ring-blue-200',
      label: 'Champion',
    },
    2: {
      card: 'border-neutral-300 bg-gradient-to-b from-neutral-100 to-white shadow-lg',
      badge: 'bg-neutral-400 text-white ring-neutral-200',
      label: 'Runner Up',
    },
    3: {
      card: 'border-orange-300 bg-gradient-to-b from-orange-50 to-white shadow-lg',
      badge: 'bg-[#cd7f32] text-white ring-orange-200',
      label: 'Third Place',
    },
  }[place]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex min-h-[210px] w-full min-w-0 rounded-2xl border-2 p-4 text-center transition-all hover:-translate-y-1 hover:shadow-2xl ${placeStyles.card} ${
        featured ? 'md:scale-105 md:z-10' : ''
      }`}
    >
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-extrabold ring-4 ${placeStyles.badge}`}>
          {place}
        </div>
      </div>
      <div className="mt-6 flex w-full min-w-0 flex-col items-center justify-between">
        <div className={`rounded-full border-4 border-gold bg-white p-1 shadow-md ${featured ? 'h-20 w-20' : 'h-16 w-16'}`}>
          <img
            src={standing.avatar_url}
            alt={`${standing.display_name} avatar`}
            className="h-full w-full rounded-full object-cover"
          />
        </div>
        <div className="mt-3 text-xs font-bold uppercase tracking-wide text-gold">
          {placeStyles.label}
        </div>
        <div
          className="mt-1 w-full max-w-full overflow-hidden break-words px-1 text-center text-sm font-semibold leading-snug text-neutral-900"
          title={`${standing.display_name}${isCurrentUser ? ' (You)' : ''}`}
        >
          {standing.display_name}
          {isCurrentUser && <span className="block text-xs font-medium text-royalBlue">(You)</span>}
        </div>
        <div className={`mt-2 font-extrabold text-neutral-900 ${featured ? 'text-xl' : 'text-lg'}`}>
          {Number(standing.total_points).toFixed(2)}
          <span className="ml-1 text-sm font-semibold text-neutral-500">pts</span>
        </div>
        <div className="mt-2 flex justify-center text-[11px] font-bold">
          <span className={`rounded-full px-2 py-1 ${
            (standing.coin_delta || 0) >= 0
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {(standing.coin_delta || 0) >= 0 ? '+' : ''}
            {Number(standing.coin_delta || 0).toFixed(0)} coins
          </span>
        </div>
      </div>
    </button>
  )
}

const LeaguePage: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate();
  const marketplaceAutoStartAttempted = useRef(false)

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
  const [editableLineupWeek, setEditableLineupWeek] = useState<string>('')
  const [standings, setStandings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<ChessPlayer | null>(null)

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
  const [selectedUserBreakdown, setSelectedUserBreakdown] = useState<RoundBreakdown>({ early: [], late: [] })
  const [selectedUserBreakdownWeeks, setSelectedUserBreakdownWeeks] = useState<string[]>([])
  const [selectedUserBreakdownWeek, setSelectedUserBreakdownWeek] = useState<string | null>(null)
  const [selectedUserBreakdownLoading, setSelectedUserBreakdownLoading] = useState(false)
  const [selectedUserBreakdownError, setSelectedUserBreakdownError] = useState('')

  const [playerBreakdown, setPlayerBreakdown] = useState<RoundBreakdown>({ early: [], late: [] });
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
      try {
        const displayWeeks = await fetchUserLeagueDisplayWeeks(user.id, league);
        setAvailableWeeks(displayWeeks);
        setSelectedWeek(displayWeeks.length > 0 ? displayWeeks[displayWeeks.length - 1] : null);
      } catch (e) {
        setAvailableWeeks([]);
        setSelectedWeek(null);
      }
    }
    fetchAvailableWeeks();
  }, [league, user]);

  useEffect(() => {
    async function loadBreakdown() {
      if (!user || !league || !selectedWeek) {
        setPlayerBreakdown({ early: [], late: [] });
        return;
      }

      setBreakdownLoading(true);
      setBreakdownError('');
      try {
        const data = await fetchLineupPlayerBreakdownByRounds(user.id, league?.id, selectedWeek.replace(/\./g, '-'));
        setPlayerBreakdown(data);
      } catch (e: any) {
        setBreakdownError('Could not load point breakdown');
      } finally {
        setBreakdownLoading(false);
      }
    }
    loadBreakdown();
  }, [user?.id, league?.id, selectedWeek, currentLineup?.total_points, currentLineup?.player_ids?.join(',')]);

  useEffect(() => {
    async function loadSelectedUserBreakdown() {
      if (!league || !selectedUser || !selectedUserBreakdownWeek) {
        setSelectedUserBreakdown({ early: [], late: [] })
        return
      }

      const isSelectedBot = Boolean(bot && selectedUser.user_id === bot.id)
      setSelectedUserBreakdownLoading(true)
      setSelectedUserBreakdownError('')

      try {
        const data = await fetchLineupParticipantBreakdownByRounds(
          isSelectedBot ? { botId: selectedUser.user_id } : { userId: selectedUser.user_id },
          league.id,
          selectedUserBreakdownWeek.replace(/\./g, '-')
        )
        setSelectedUserBreakdown(data)
      } catch (e) {
        console.error('Could not load selected user breakdown:', e)
        setSelectedUserBreakdownError('Could not load score breakdown')
      } finally {
        setSelectedUserBreakdownLoading(false)
      }
    }

    loadSelectedUserBreakdown()
  }, [league?.id, selectedUser?.user_id, selectedUserBreakdownWeek, bot?.id])

  useEffect(() => {
    async function maybeProcessPayout() {
      if (
        league &&
        leagueSeasonHasEndedLocal(league?.end_date || '') &&
        !league?.payout_processed
      ) {
        const { error: payoutError } = await supabase.rpc('process_league_payouts');
        if (payoutError) {
          console.error('Failed to process league payouts:', payoutError);
          setError(payoutError.message || 'Failed to process league payout.');
          return;
        }

        await loadLeagueData();
      }
    }
    maybeProcessPayout();
  }, [league]);

  useEffect(() => {
    if (leagueId && user) {
      loadLeagueData()
    }
  }, [leagueId, user])

  useEffect(() => {
    if (!leagueId || !user) return

    const channel = supabase
      .channel(`league-roster-${leagueId}-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `league_id=eq.${leagueId}` },
        () => {
          loadLeagueData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lineups', filter: `league_id=eq.${leagueId}` },
        () => {
          loadLeagueData()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leagues', filter: `id=eq.${leagueId}` },
        () => {
          loadLeagueData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leagueId, user?.id])

  useEffect(() => {
    if (isEditingLineup && !isLineupChangeAllowed()) {
      setIsEditingLineup(false)
      setSelectedLineupPlayers(currentLineup?.player_ids || [])
      setError(lineupChangeBlockedMessage())
    }
  }, [isEditingLineup, currentLineup])

  useEffect(() => {
    if (isEditingLineup && league?.end_date && leagueSeasonHasEndedLocal(league.end_date)) {
      setIsEditingLineup(false)
      setSelectedLineupPlayers(currentLineup?.player_ids || [])
      setError('This league has ended. Lineups can no longer be changed.')
    }
  }, [isEditingLineup, league?.end_date, currentLineup])

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

      let leagueRow = leagueData as League
      const memberIds = leagueRow.member_ids || []
      const isMember =
        memberIds.includes(user.id) || leagueRow.creator_id === user.id
      if (!isMember) {
        setError('You are not a member of this league.')
        setLeague(null)
        return
      }

      if (!marketplaceAutoStartAttempted.current && isMarketplaceAutoStartDue(leagueRow)) {
        marketplaceAutoStartAttempted.current = true
        const { error: autoStartError } = await supabase.rpc('auto_start_due_marketplaces')
        if (!autoStartError) {
          const { data: refreshedLeague } = await supabase
            .from('leagues')
            .select('*')
            .eq('id', leagueId)
            .single()
          if (refreshedLeague) {
            leagueRow = refreshedLeague as League
          }
          if (leagueRow.marketplace_started) {
            void notifyMarketplaceStartedIfNeeded(leagueId)
          }
        }
      }

      setLeague(leagueRow);
      // Combine all relevant user IDs
      const allUserIds = Array.from(new Set([
        ...(leagueRow.member_ids || []),
        ...(leagueRow.draft_order || [])
      ]));
      fetchUserMap(allUserIds)

      // Get user's team
      let teamData = null;
      try {
        const { data: teamResult } = await supabase
          .from('teams')
          .select('*')
          .eq('user_id', user.id)
          .eq('league_id', leagueId)
          .maybeSingle(); // Use maybeSingle instead of single to handle no results
        teamData = teamResult;
      } catch (error) {
        // Teams query failed, continuing without team data
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
          } else {
            setTeamPlayers([])
          }
        } catch (error) {
          // Team players query failed
          setTeamPlayers([])
        }
      } else {
        setTeamPlayers([])
      }
      const teamPlayerIds = new Set<string>(teamData?.player_ids || [])

      // Get available players for draft
      if (!isTeamBuildingComplete(leagueRow)) {
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

      // Get the lineup users can currently edit. Once this week's games are imported,
      // lineup changes should apply to next week instead of mutating scored results.
      const currentWeek = getCurrentWeekStart()
      const lineupWeek = await getEditableLineupWeekStart()
      setEditableLineupWeek(lineupWeek)

      const { data: lineupData, error: lineupError } = await supabase
        .from('lineups')
        .select('*')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .eq('week_start_date', lineupWeek)
        .maybeSingle() // Use maybeSingle instead of single to handle no results

      let lineupToDisplay = lineupData
      if (!lineupToDisplay && !lineupError && lineupWeek !== currentWeek) {
        const { data: scoredCurrentLineup } = await supabase
          .from('lineups')
          .select('*')
          .eq('user_id', user.id)
          .eq('league_id', leagueId)
          .eq('week_start_date', currentWeek)
          .maybeSingle()

        if (scoredCurrentLineup) {
          lineupToDisplay = {
            ...scoredCurrentLineup,
            id: '',
            week_start_date: lineupWeek,
            total_points: 0,
          }
        }
      }

      if (lineupToDisplay && !lineupError) {
        const currentTeamLineupIds = (lineupToDisplay.player_ids || []).filter((id: string) =>
          teamPlayerIds.has(id)
        )
        const filteredLineupToDisplay = {
          ...lineupToDisplay,
          player_ids: currentTeamLineupIds,
        }

        setCurrentLineup(filteredLineupToDisplay)
        setSelectedLineupPlayers(currentTeamLineupIds)

        // Get lineup players
        if (currentTeamLineupIds.length > 0) {
          const { data: lineupPlayers } = await supabase
            .from('chess_players')
            .select('*')
            .in('id', currentTeamLineupIds)

          setLineupPlayers(lineupPlayers || [])
        } else {
          setLineupPlayers([])
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
        .select('member_ids, creator_id, buy_in, payout_processed')
        .eq('id', leagueId)
        .single()

      if (!leagueData) return

      let leaguePayout: { user_id: string; amount: number } | null = null
      if (!leagueData.payout_processed) {
        const { data: payoutData, error: payoutError } = await supabase
          .from('payouts')
          .select('user_id, amount')
          .eq('league_id', leagueId)
          .order('processed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (payoutError) {
          console.warn('Could not load payout row for standings coin display:', payoutError)
        } else {
          leaguePayout = payoutData
        }
      }

      // Get all unique user IDs (creator + members)
      const allUserIds = new Set([
        leagueData.creator_id,
        ...(leagueData.member_ids || [])
      ])

      const avatarMap: Record<string, { username: string; avatar_url: string }> = {}
      Array.from(allUserIds).forEach((userId) => {
        avatarMap[userId] = {
          username: `User_${userId.slice(0, 6)}`,
          avatar_url: resolveAvatarUrl(),
        }
      })

      // Get user details from users table
      const { data: userDetails } = await supabase
        .from('users')
        .select('id, username, selected_avatar_url')
        .in('id', Array.from(allUserIds))

      if (userDetails) {
        userDetails.forEach((u) => {
          avatarMap[u.id] = {
            username: u.username || `User_${u.id.slice(0, 6)}`,
            avatar_url: resolveAvatarUrl(u.selected_avatar_url),
          }
        })
      }

      // Create a map of user details (for standings)
      const userMap = avatarMap

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

      const memberCount = leagueData.member_ids?.length || 0
      const buyIn = Number(leagueData.buy_in || 0)
      const prizeAmount = Number(leaguePayout?.amount ?? buyIn * memberCount)
      const payoutWinnerId = leaguePayout?.user_id

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
            return null
          }
          return {
            user_id: userId,
            display_name: userMap[userId]?.username || 'Unknown User',
            total_points: userPoints.get(userId) || 0,
            coin_delta: payoutWinnerId === userId
              ? prizeAmount - buyIn
              : -buyIn,
            rank: 0,
            avatar_url: resolveAvatarUrl(userMap[userId]?.avatar_url),
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null) // Type-safe filter

      // Add bot to standings if it exists
      if (botData) {
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
          coin_delta: payoutWinnerId === botData.id
            ? prizeAmount - buyIn
            : -buyIn,
          rank: 0,
          avatar_url: resolveAvatarUrl(),
        })
      }

      // Sort by points and assign ranks
      standingsData.sort((a, b) => b.total_points - a.total_points)
      standingsData.forEach((standing, index) => {
        standing.rank = index + 1
        const isWinner = payoutWinnerId
          ? standing.user_id === payoutWinnerId
          : index === 0
        standing.coin_delta = isWinner ? prizeAmount - buyIn : -buyIn
      })

      setStandings(standingsData)
    } catch (error) {
      console.error('Error loading standings:', error)
    }
  }

  const getCurrentWeekStart = () => {
    return getWeekStartMonday()
  }

  const getTuesdayDateForWeek = (weekStartDate: string) => {
    const [year, month, day] = weekStartDate.split('-').map(Number)
    const tuesday = new Date(Date.UTC(year, month - 1, day + 1))
    const yyyy = tuesday.getUTCFullYear()
    const mm = String(tuesday.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(tuesday.getUTCDate()).padStart(2, '0')
    return {
      dashed: `${yyyy}-${mm}-${dd}`,
      dotted: `${yyyy}.${mm}.${dd}`,
    }
  }

  const hasImportedGamesForWeek = async (weekStartDate: string) => {
    const { dotted } = getTuesdayDateForWeek(weekStartDate)
    const { count, error } = await supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('date', dotted)

    if (error) {
      console.error('Error checking imported games for lineup lock:', error)
      return false
    }

    return (count || 0) > 0
  }

  const getEditableLineupWeekStart = async () => {
    const currentWeek = getCurrentWeekStart()
    return (await hasImportedGamesForWeek(currentWeek))
      ? addDaysToYmd(currentWeek, 7)
      : currentWeek
  }

  const saveLineup = async () => {
    if (!league || !user || selectedLineupPlayers.length < 1 || selectedLineupPlayers.length > 5) return

    if (leagueSeasonHasEndedLocal(league.end_date)) {
      setIsEditingLineup(false)
      setSelectedLineupPlayers(currentLineup?.player_ids || [])
      setError('This league has ended. Lineups can no longer be changed.')
      return
    }

    if (!isLineupChangeAllowed()) {
      setIsEditingLineup(false)
      setSelectedLineupPlayers(currentLineup?.player_ids || [])
      setError(lineupChangeBlockedMessage())
      return
    }

    // Prevent duplicate player IDs in the lineup and avoid carrying sold players
    // forward from a previously scored lineup template.
    const dedupedPlayerIds = Array.from(new Set(selectedLineupPlayers))
    if (dedupedPlayerIds.length !== selectedLineupPlayers.length) {
      setError('You cannot select the same player more than once in your lineup.');
      return;
    }

    const teamPlayerIds = new Set(teamPlayers.map(player => player.id))
    const uniquePlayerIds = dedupedPlayerIds.filter(id => teamPlayerIds.has(id));
    if (uniquePlayerIds.length < 1) {
      setError('Select at least one player from your current team.');
      return;
    }

    try {
      setLoading(true)

      const lineupWeek = await getEditableLineupWeekStart()
      setEditableLineupWeek(lineupWeek)

      const { data: existingLineup, error: existingLineupError } = await supabase
        .from('lineups')
        .select('id')
        .eq('user_id', user.id)
        .eq('league_id', league.id)
        .eq('week_start_date', lineupWeek)
        .maybeSingle()

      if (existingLineupError) {
        setError(existingLineupError.message || 'Failed to load lineup')
        return
      }

      if (existingLineup) {
        const { error: updateError } = await supabase
          .from('lineups')
          .update({
            player_ids: uniquePlayerIds,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLineup.id)

        if (updateError) {
          setError(updateError.message || 'Failed to update lineup')
          return
        }
      } else {
        const { error: insertError } = await supabase
          .from('lineups')
          .insert([
            {
              user_id: user.id,
              league_id: league.id,
              week_start_date: lineupWeek,
              player_ids: uniquePlayerIds,
              total_points: 0
            }
          ]);
        if (insertError) {
          setError(insertError.message || 'Failed to insert lineup');
          return;
        }
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

    if (leagueSeasonHasStartedLocal(league.start_date)) {
      setBotNameError('Bots cannot be added after the league has started')
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
        
        const { data: latestLeague, error: latestLeagueError } = await supabase
          .from('leagues')
          .select('member_ids, marketplace_started, marketplace_order')
          .eq('id', league.id)
          .single()

        if (latestLeagueError || !latestLeague) {
          throw latestLeagueError || new Error('Failed to refresh league members')
        }

        // Update league with bot_id using the latest member_ids so newer joins are preserved.
        const allDraftParticipants = await orderParticipantsWithBotsLast([...(latestLeague.member_ids || []), newBot.id])
        const updatedDraftOrder = generateSnakeDraftOrder(allDraftParticipants, 10)
        
        // Also regenerate marketplace order if marketplace has started
        let marketplaceOrderUpdate = {}
        if (latestLeague.marketplace_started && latestLeague.marketplace_order) {
          const updatedMarketplaceOrder = generateSnakeDraftOrder(allDraftParticipants, 10)
          marketplaceOrderUpdate = {
            marketplace_order: updatedMarketplaceOrder,
            current_marketplace_turn: 0 // Reset marketplace turn
          }
        }
        
        // Update the league with bot information
        await supabase
          .from('leagues')
          .update({ 
            member_ids: allDraftParticipants, // Add bot to member_ids
            draft_order: updatedDraftOrder,
            current_draft_turn: 0,
            ...marketplaceOrderUpdate // Include marketplace order update if needed
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
    if (leagueSeasonHasStartedLocal(league.start_date)) {
      setError('Bots cannot be removed after the league has started.')
      return
    }

    try {
      setBotLoading(true)

      const { success, error } = await removeBot(bot.id)
      
      if (success) {
        setBot(null)
        
        const { data: latestLeague, error: latestLeagueError } = await supabase
          .from('leagues')
          .select('member_ids, marketplace_started, marketplace_order')
          .eq('id', league.id)
          .single()

        if (latestLeagueError || !latestLeague) {
          throw latestLeagueError || new Error('Failed to refresh league members')
        }

        // Update league to remove bot while preserving any members who joined after this page loaded.
        const updatedMemberIds = (latestLeague.member_ids || []).filter((id: string) => id !== bot.id);
        const orderedParticipants = await orderParticipantsWithBotsLast(updatedMemberIds)
        const updatedDraftOrder = generateSnakeDraftOrder(orderedParticipants, 10)
        
        // Also regenerate marketplace order if marketplace has started
        const updatedMarketplaceOrder = latestLeague.marketplace_started ? generateSnakeDraftOrder(orderedParticipants, 10) : latestLeague.marketplace_order;
        
        // Update the league to remove bot information
        await supabase
          .from('leagues')
          .update({ 
            member_ids: updatedMemberIds, // Remove bot from member_ids
            draft_order: updatedDraftOrder,
            marketplace_order: updatedMarketplaceOrder, // Update marketplace order too
            current_draft_turn: 0,
            current_marketplace_turn: 0 // Reset marketplace turn too
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
      setSelectedUserTeam([])
      setSelectedUserLineup([])
      setSelectedUserBreakdown({ early: [], late: [] })
      setSelectedUserBreakdownWeeks([])
      setSelectedUserBreakdownWeek(null)
      setSelectedUserBreakdownError('')

      // Check if this is a bot by checking if userData.user_id matches bot.id
      const isBot = Boolean(bot && userData.user_id === bot.id);
      const selectedBot = isBot ? bot : null;
      const participant = isBot ? { botId: userData.user_id } : { userId: userData.user_id }

      if (league) {
        const displayWeeks = await fetchLineupParticipantDisplayWeeks(participant, league)
        setSelectedUserBreakdownWeeks(displayWeeks)
        setSelectedUserBreakdownWeek(displayWeeks.length > 0 ? displayWeeks[displayWeeks.length - 1] : null)
      }

      // Get user's team
      let teamData = null;
      if (selectedBot) {
        // Fetch bot's team by bot_id
        const { data } = await supabase
          .from('teams')
          .select('*')
          .eq('bot_id', selectedBot.id)
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

      const selectedTeamPlayerIds = new Set<string>(teamData?.player_ids || [])

      if (teamData && teamData.player_ids?.length > 0) {
        const { data: teamPlayers } = await supabase
          .from('chess_players')
          .select('*')
          .in('id', teamData.player_ids)

        setSelectedUserTeam(teamPlayers || [])
      } else {
        setSelectedUserTeam([])
      }

      // Get participant's editable lineup. Once this week is scored, this means next week.
      const currentWeek = await getEditableLineupWeekStart()
      let lineupData = null;
      try {
        if (selectedBot) {
          const { data } = await supabase
            .from('lineups')
            .select('*')
            .eq('bot_id', selectedBot.id)
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
        // Lineups query failed, continuing without lineup data
        lineupData = null;
      }

      if (lineupData) {
        try {
          const currentTeamLineupIds = (lineupData.player_ids || []).filter((id: string) =>
            selectedTeamPlayerIds.has(id)
          )

          if (currentTeamLineupIds.length > 0) {
            const { data: lineupPlayers } = await supabase
              .from('chess_players')
              .select('*')
              .in('id', currentTeamLineupIds)

            setSelectedUserLineup(lineupPlayers || [])
          } else {
            setSelectedUserLineup([])
          }
        } catch (error) {
          
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
      const map: { [id: string]: string } = {}
      ids.forEach((id) => {
        map[id] = `User_${id.slice(0, 6)}`
      })

      const { data: userData, error } = await supabase
        .from('users')
        .select('id, username')
        .in('id', ids);
      
      if (userData && !error) {
        userData.forEach((user) => {
          map[user.id] = user.username || 'Unknown User'
        })
      }

      setUserMap(map)
    } catch (err) {
      console.error('Error in fetchUserMap:', err);
      const fallbackMap: { [id: string]: string } = {};
      ids.forEach(id => {
        fallbackMap[id] = `User_${id.slice(0, 6)}`;
      });
      
      setUserMap(fallbackMap);
    }
  };

  // Fetch payout and winner info for ended leagues. The payout row is the source
  // of truth because the league flag can be stale in the client after manual SQL.
  useEffect(() => {
    async function fetchPayoutAndWinner() {
      if (
        league &&
        leagueSeasonHasEndedLocal(league?.end_date || '')
      ) {
        if (league.payout_processed) {
          setPayout(null);
          setWinnerName(standings[0]?.display_name || '');
          return;
        }

        const { data: payoutData, error: payoutError } = await supabase
          .from('payouts')
          .select('user_id, amount, processed_at')
          .eq('league_id', league?.id)
          .order('processed_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle instead of single

        if (payoutError) {
          console.warn('Could not load payout details:', payoutError);
          setPayout(null);
          setWinnerName(standings[0]?.display_name || '');
          return;
        }

        setPayout(payoutData);
        if (payoutData) {
          if (!league.payout_processed) {
            setLeague(currentLeague =>
              currentLeague?.id === league.id
                ? { ...currentLeague, payout_processed: true }
                : currentLeague
            );
          }

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
  }, [league, userMap, standings]);

  // Show confetti for a few seconds when the league is completed and podium is shown
  useEffect(() => {
    if (league?.end_date && leagueSeasonHasEndedLocal(league.end_date) && payout) {
      setShowConfetti(true);
      const timeout = setTimeout(() => setShowConfetti(false), 8000); // 8 seconds for all confetti to fall
      return () => clearTimeout(timeout);
    } else {
      setShowConfetti(false);
    }
  }, [league?.end_date, payout]);

  // Delete league (admin only)
  const handleDeleteLeague = async () => {
    if (!league || !isOwner) return;
    if (leagueSeasonHasStartedLocal(league.start_date) || leagueSeasonHasEndedLocal(league.end_date)) {
      setError('Leagues cannot be deleted after they have started.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this league? This cannot be undone.')) return;
    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('delete_league_clean', {
        league_uuid: league.id
      });
      
      
      if (rpcError) {
        
        // Try the direct function as fallback
        const { error: directRpcError } = await supabase.rpc('delete_league_direct', {
          league_uuid: league.id
        });
        
        
        if (directRpcError) {
          
          // Try the RLS restore function
          const { error: rlsRpcError } = await supabase.rpc('delete_league_and_restore_rls', {
            league_uuid: league.id
          });
          
          
          if (rlsRpcError) {
            
            // Final fallback: try manual deletion
            
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
    if (leagueSeasonHasStartedLocal(league.start_date)) {
      setError('You cannot leave a league after it has started.');
      return;
    }
    if (!window.confirm('Are you sure you want to leave this league?')) return;
    await removeUserFromLeague(user.id);
  };

  // Remove user from league (for creators or self)
  const removeUserFromLeague = async (userIdToRemove: string) => {
    if (!league || !user) return;
    if (!user.id) return;
    
    // Only allow if user is the creator or removing themselves
    if (!isOwner && user.id !== userIdToRemove) return;

    if (leagueSeasonHasStartedLocal(league.start_date)) {
      setError(
        user.id === userIdToRemove
          ? 'You cannot leave a league after it has started.'
          : 'Players cannot be removed after the league has started.'
      );
      return;
    }
    
    const confirmMessage = user.id === userIdToRemove 
      ? 'Are you sure you want to leave this league?' 
      : 'Are you sure you want to remove this player from the league?';
    
    if (!window.confirm(confirmMessage)) return;
    
    setLoading(true);
    try {
      // First, update the league's member_ids (while user is still a member)
      const updatedMemberIds = (league.member_ids || []).filter(
        (id: string) => id !== userIdToRemove
      );
      const updatedDraftOrder = (league.draft_order || []).filter(
        (id: string) => id !== userIdToRemove
      );

      const leagueUpdate: Record<string, unknown> = {
        member_ids: updatedMemberIds,
        draft_order: updatedDraftOrder,
      };

      if (league.marketplace_started && league.marketplace_order?.length) {
        const newMarketplaceOrder = league.marketplace_order.filter(
          (id: string) => id !== userIdToRemove
        );
        let newTurn = league.current_marketplace_turn ?? 0;
        if (newTurn >= newMarketplaceOrder.length) {
          newTurn = Math.max(0, newMarketplaceOrder.length - 1);
        }
        leagueUpdate.marketplace_order = newMarketplaceOrder;
        leagueUpdate.current_marketplace_turn = newTurn;
        if (newMarketplaceOrder.length === 0) {
          leagueUpdate.marketplace_completed = true;
          leagueUpdate.draft_completed = true;
        }
      }

      const { error: leaguesError } = await supabase
        .from('leagues')
        .update(leagueUpdate)
        .eq('id', league.id);
      if (leaguesError) {
        console.error('Error updating leagues.member_ids:', leaguesError);
        setError('Failed to update league members: ' + leaguesError.message);
        setLoading(false);
        return;
      }
      
      // Then remove from league_members (if table exists and user is not a bot)
      const { error: leagueMembersError } = await supabase
        .from('league_members')
        .delete()
        .eq('league_id', league.id)
        .eq('user_id', userIdToRemove);
      if (leagueMembersError) {
        // Don't fail if league_members table doesn't exist or user is a bot
        console.log('Note: Could not remove from league_members (table may not exist or user is bot):', leagueMembersError.message);
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

  if (loading && !league) {
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

  const teamBuildingComplete = isTeamBuildingComplete(league)
  const seasonStarted = leagueSeasonHasStartedLocal(league.start_date)
  const seasonEnded = leagueSeasonHasEndedLocal(league.end_date)
  const computedPrizeAmount = Number(league.buy_in || 0) * (league.member_ids?.length || 0)

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
                {seasonEnded && (
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
            {seasonEnded && (
              <div className="bg-green-100 rounded-lg p-4 my-4 border border-green-200">
                <h3 className="font-bold text-lg text-green-800">
                  Winner: {winnerName || standings[0]?.display_name || 'Pending final standings'}
                </h3>
                {payout ? (
                  <>
                    <p className="text-green-700">Prize: {payout.amount} coins</p>
                    <p className="text-green-700">Payout processed: {new Date(payout.processed_at).toLocaleString()}</p>
                  </>
                ) : league?.payout_processed ? (
                  <>
                    <p className="text-green-700">Prize: {computedPrizeAmount} coins</p>
                    <p className="text-green-700">Payout processed.</p>
                  </>
                ) : (
                  <p className="text-green-700">
                    Final standings are locked. Prize payout is pending processing.
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-gold" />
                <span className="text-xs lg:text-sm text-neutral-600">
                  <span>
                    {seasonEnded ? 'Ended: ' : seasonStarted ? 'Ends: ' : 'Starts: '}
                    {formatCalendarDate(seasonStarted ? league.end_date : league.start_date)}
                  </span>
                  {seasonStarted && (
                    <span className="block text-[11px] lg:text-xs text-neutral-500">
                      Started {formatCalendarDate(league.start_date)}
                    </span>
                  )}
                  <span className="relative group cursor-pointer ml-1">
                    <svg className="w-3 h-3 text-royalBlue inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white text-neutral-900 text-xs rounded shadow-lg border border-royalBlue px-3 py-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      The start date is when points begin accumulating. After a league starts, this card shows the end date, and the original start date remains listed below it. The turn-based marketplace auto-starts one week before the start date if it has not been started manually.
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
                  Draft: {getTeamBuildingStatusLabel(league)}
                </span>
              </div>
            </div>
          </div>

          {/* Bot Management Section - Only visible to league owner before the league starts */}
          {isOwner && !seasonStarted && !teamBuildingComplete && !league?.marketplace_started && (
            <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 mb-6 lg:mb-8 border-2 border-royalBlue">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg lg:text-xl font-bold text-neutral-900 flex items-center">
                  <BotIcon className="w-5 h-5 mr-2 text-royalBlue" />
                  Bot Management
                </h2>
                {!bot && league && !seasonEnded && (
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
                  {league && seasonEnded ? (
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
            {isOwner && !seasonStarted && !seasonEnded && (
              <button
                onClick={handleDeleteLeague}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold shadow-lg"
                disabled={loading}
              >
                Delete League
              </button>
            )}
            {!isOwner && !seasonStarted && user?.id && league?.member_ids?.includes(user.id) && (
              <button
                onClick={handleLeaveLeague}
                className="bg-neutral-300 hover:bg-neutral-400 text-neutral-900 px-4 py-2 rounded font-semibold shadow-lg"
                disabled={loading}
              >
                Leave League
              </button>
            )}
          </div>

          <div className={`grid grid-cols-1 gap-6 lg:gap-8 ${seasonEnded ? '' : 'lg:grid-cols-2'}`}>
            {/* Standings */}
            <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold relative">
              {showConfetti && <Confetti className="pointer-events-none" style={{zIndex: 30}} />}
              <h2 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Standings</h2>
              {seasonEnded ? (
                <>
                  {showConfetti && <Confetti className="pointer-events-none" style={{zIndex: 30}} />}
                  {/* Podium for Top 3 */}
                  <div className="mb-8 rounded-3xl border border-gold/40 bg-gradient-to-br from-amber-50 via-white to-blue-50 px-4 pb-5 pt-8 shadow-inner">
                    <div className="mb-10 text-center">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Final Results</p>
                      <h3 className="mt-1 text-2xl font-extrabold text-neutral-900">League Champions</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-end">
                      {standings[1] && (
                        <div className="order-2 md:order-1">
                          <FinalPodiumCard
                            standing={standings[1]}
                            place={2}
                            isCurrentUser={standings[1].user_id === user?.id}
                            onSelect={() => handleUserClick(standings[1])}
                          />
                        </div>
                      )}
                      {standings[0] && (
                        <div className="order-1 md:order-2">
                          <FinalPodiumCard
                            standing={standings[0]}
                            place={1}
                            featured
                            isCurrentUser={standings[0].user_id === user?.id}
                            onSelect={() => handleUserClick(standings[0])}
                          />
                        </div>
                      )}
                      {standings[2] && (
                        <div className="order-3">
                          <FinalPodiumCard
                            standing={standings[2]}
                            place={3}
                            isCurrentUser={standings[2].user_id === user?.id}
                            onSelect={() => handleUserClick(standings[2])}
                          />
                        </div>
                      )}
                    </div>
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
                            <div className="flex flex-col items-end flex-shrink-0 ml-2">
                              <p className="font-semibold text-sm lg:text-base text-neutral-900">{Number(standing.total_points).toFixed(2)} points</p>
                              <span className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                (standing.coin_delta || 0) >= 0
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {(standing.coin_delta || 0) >= 0 ? '+' : ''}
                                {Number(standing.coin_delta || 0).toFixed(0)} coins
                              </span>
                              {isOwner && !seasonStarted && standing.user_id !== user?.id && (
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
                  {standings.length === 0 && (
                    <div className="text-neutral-600">Final standings are not available yet.</div>
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
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-bold flex-shrink-0 ${
                          standing.user_id === user?.id ? 'bg-royalBlue text-white' : 'bg-neutral-300 text-neutral-700'
                        }`}>
                          {standing.rank}
                        </div>
                        <img src={standing.avatar_url} alt="Avatar" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-gold flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <ExpandableUsername 
                            username={standing.display_name}
                            isCurrentUser={standing.user_id === user?.id}
                            maxWidth="120px"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 ml-1 sm:ml-2">
                        <p className="font-semibold text-xs sm:text-sm lg:text-base text-neutral-900 whitespace-nowrap">{Number(standing.total_points).toFixed(2)} pts</p>
                        {seasonEnded && (
                          <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold ${
                            (standing.coin_delta || 0) >= 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {(standing.coin_delta || 0) >= 0 ? '+' : ''}
                            {Number(standing.coin_delta || 0).toFixed(0)} coins
                          </span>
                        )}
                        {isOwner && !seasonStarted && standing.user_id !== user?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUserFromLeague(standing.user_id);
                            }}
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors flex-shrink-0"
                            title="Remove player from league"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Management */}
            {!seasonEnded && (
            <div className="space-y-4 lg:space-y-6">
              {/* Your Team */}
              <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
                <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Your Team</h3>
                {teamPlayers.length === 0 ? (
                  <div className="text-neutral-500 text-sm">You haven't drafted any players yet.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {teamPlayers.map((player) => (
                      <div 
                        key={player.id} 
                        onClick={() => setSelectedPlayerForModal(player)}
                        className="bg-neutral-50 rounded-lg p-4 text-center border border-gold min-h-[80px] flex flex-col justify-center cursor-pointer hover:border-royalBlue hover:shadow-lg transition-all"
                      >
                        <div className="text-sm font-medium mb-1 text-gold truncate px-1" title={player.name}>
                          {player.name}
                        </div>
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
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-neutral-900">Current Lineup</h3>
                    {editableLineupWeek && (
                      <p className="text-xs text-neutral-500">
                        Applies to week of {formatCalendarDate(editableLineupWeek)}
                      </p>
                    )}
                  </div>
                  {teamPlayers.length >= 1 && !isEditingLineup && !seasonEnded && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLineupChangeAllowed()) {
                          setError(lineupChangeBlockedMessage());
                          return;
                        }
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {lineupPlayers.map((player) => (
                      <div 
                        key={player.id} 
                        onClick={() => setSelectedPlayerForModal(player)}
                        className="bg-neutral-50 rounded-lg p-4 text-center border border-gold min-h-[80px] flex flex-col justify-center cursor-pointer hover:border-royalBlue hover:shadow-lg transition-all"
                      >
                        <div className="text-sm font-medium mb-1 text-gold truncate px-1" title={player.name}>
                          {player.name}
                        </div>
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
              {!seasonEnded && !teamBuildingComplete && !league.marketplace_completed && (
                <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
                  <TurnBasedMarketplace league={league} onUpdate={loadLeagueData} />
                </div>
              )}
            </div>
            )}
          </div>



          {/* Coin Marketplace - Show after draft is completed */}
          {league && !seasonEnded && isCoinMarketplaceAvailable(league) && (
            <div className="mt-8 w-full">
                  <Marketplace leagueId={leagueId!} onTeamUpdate={loadLeagueData} />
            </div>
          )}

          {/* User Popup Modal */}
          {showUserPopup && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-gold">
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
                          <div 
                            key={player.id} 
                            onClick={() => setSelectedPlayerForModal(player)}
                            className="bg-neutral-50 rounded-lg p-3 text-center border border-gold cursor-pointer hover:border-royalBlue hover:shadow-lg transition-all"
                          >
                            <div className="text-sm font-medium text-gold mb-1">
                              {player.name}
                            </div>
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
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-neutral-900">Current Lineup ({selectedUserLineup.length}/5 players)</h3>
                    {selectedUserLineup.length === 0 ? (
                      <p className="text-neutral-500 text-sm">No lineup set for this week.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {selectedUserLineup.map((player) => (
                          <div 
                            key={player.id} 
                            onClick={() => setSelectedPlayerForModal(player)}
                            className="bg-royalBlue bg-opacity-10 rounded-lg p-3 text-center border border-royalBlue cursor-pointer hover:bg-opacity-20 hover:shadow-lg transition-all"
                          >
                            <div className="text-sm font-medium text-royalBlue mb-1">
                              {player.name}
                            </div>
                            <div className="text-xs text-neutral-600">ELO: {player.elo}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Score Breakdown Section */}
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-neutral-900">Score Breakdown</h3>
                      {selectedUserBreakdownWeeks.length > 0 && (
                        <select
                          className="border border-neutral-300 rounded px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-royalBlue"
                          value={selectedUserBreakdownWeek || ''}
                          onChange={e => setSelectedUserBreakdownWeek(e.target.value)}
                        >
                          {selectedUserBreakdownWeeks.map(week => (
                            <option key={week} value={week}>{week}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {selectedUserBreakdownLoading ? (
                      <div className="text-neutral-600">Loading breakdown...</div>
                    ) : selectedUserBreakdownError ? (
                      <div className="text-red-600">{selectedUserBreakdownError}</div>
                    ) : selectedUserBreakdown.early.length > 0 || selectedUserBreakdown.late.length > 0 ? (
                      <div className="space-y-5">
                        {selectedUserBreakdown.early.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 text-neutral-900">Early Round</h4>
                            <table className="min-w-full text-sm text-neutral-900">
                              <thead>
                                <tr>
                                  <th className="text-left px-2 py-1 border-b border-royalBlue">Player</th>
                                  <th className="text-center px-2 py-1 border-b border-royalBlue">Record</th>
                                  <th className="text-right px-2 py-1 border-b border-royalBlue">Points</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedUserBreakdown.early.map((row) => (
                                  <tr key={`early-${row.player_id || row.player_name}`} className="border-b border-neutral-100 last:border-b-0">
                                    <td className="px-2 py-1">{row.player_name}</td>
                                    <td className="px-2 py-1 text-center">
                                      {row.wins !== undefined && row.total_games !== undefined ? `${row.wins}/${row.total_games}` : '-'}
                                    </td>
                                    <td className="px-2 py-1 text-right">{Number(row.player_points).toFixed(2)}</td>
                                  </tr>
                                ))}
                                <tr className="font-bold border-t border-royalBlue">
                                  <td className="px-2 py-1">TOTAL</td>
                                  <td className="px-2 py-1 text-center">-</td>
                                  <td className="px-2 py-1 text-right">
                                    {selectedUserBreakdown.early.reduce((sum, p) => sum + Number(p.player_points), 0).toFixed(2)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {selectedUserBreakdown.late.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 text-neutral-900">Late Round</h4>
                            <table className="min-w-full text-sm text-neutral-900">
                              <thead>
                                <tr>
                                  <th className="text-left px-2 py-1 border-b border-royalBlue">Player</th>
                                  <th className="text-center px-2 py-1 border-b border-royalBlue">Record</th>
                                  <th className="text-right px-2 py-1 border-b border-royalBlue">Points</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedUserBreakdown.late.map((row) => (
                                  <tr key={`late-${row.player_id || row.player_name}`} className="border-b border-neutral-100 last:border-b-0">
                                    <td className="px-2 py-1">{row.player_name}</td>
                                    <td className="px-2 py-1 text-center">
                                      {row.wins !== undefined && row.total_games !== undefined ? `${row.wins}/${row.total_games}` : '-'}
                                    </td>
                                    <td className="px-2 py-1 text-right">{Number(row.player_points).toFixed(2)}</td>
                                  </tr>
                                ))}
                                <tr className="font-bold border-t border-royalBlue">
                                  <td className="px-2 py-1">TOTAL</td>
                                  <td className="px-2 py-1 text-center">-</td>
                                  <td className="px-2 py-1 text-right">
                                    {selectedUserBreakdown.late.reduce((sum, p) => sum + Number(p.player_points), 0).toFixed(2)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="bg-neutral-50 rounded-lg p-3 border border-royalBlue">
                          <span className="font-semibold text-neutral-900">Week Total: </span>
                          <span className="font-bold text-royalBlue">
                            {(selectedUserBreakdown.early.reduce((sum, p) => sum + Number(p.player_points), 0) +
                              selectedUserBreakdown.late.reduce((sum, p) => sum + Number(p.player_points), 0)).toFixed(2)} points
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-sm">No scored breakdown available for this participant yet.</p>
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
                        <li>• Can be removed by the league owner before the league starts</li>
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

      {/* Player Detail Modal */}
      {selectedPlayerForModal && (
        <PlayerDetailModal
          player={selectedPlayerForModal}
          onClose={() => setSelectedPlayerForModal(null)}
        />
      )}
    </>
  )
}

export default LeaguePage
