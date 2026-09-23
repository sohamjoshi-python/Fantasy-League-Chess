import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { autoMarketplaceForBot } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChessPlayer, League, CurrentMarketplaceTurn, MarketplaceTurn } from '../types';
import {
  formatCalendarDate,
  formatMarketplaceTurnRemaining,
  getMarketplaceAutoStartDate,
  getMarketplaceTurnMsRemaining,
  getMarketplaceTurnTimeoutHours,
  getMarketplaceTurnTimeoutLabel,
  getMarketplaceTurnTimeoutMs,
  isMarketplaceAutoStartDue,
  isPlayerAlreadyOwnedError,
  isTeamBuildingComplete,
  loadFiveMinuteDraftLeagueIds,
  preserveMarketplaceTurn,
  SNAKE_DRAFT_ROUNDS,
} from '../lib/leagueStatus';
import { calculatePlayerPrice } from '../types/coin-system';
import { notifyMarketplaceStartedIfNeeded, notifyMarketplaceTurnIfNeeded } from '../lib/marketplaceTurnEmail';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { useDebounce } from '../hooks/useDebounce';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { StaggeredTransition } from './ui/SmoothTransition';
import PlayerCard from './PlayerCard';
import PlayerDetailModal from './PlayerDetailModal';

interface TurnBasedMarketplaceProps {
  league: League;
  onUpdate: () => void;
}

// Helper function to generate snake draft order
function generateSnakeDraftOrder(participants: string[], rounds: number): string[] {
  const order: string[] = [];
  
  // For each round (0-9), add all participants in snake order
  for (let round = 0; round < rounds; round++) {
    if (round % 2 === 0) {
      // Even rounds: forward order (1, 2, 3, ...)
      for (let i = 0; i < participants.length; i++) {
        order.push(participants[i]);
      }
    } else {
      // Odd rounds: reverse order (3, 2, 1, ...)
      for (let i = participants.length - 1; i >= 0; i--) {
        order.push(participants[i]);
      }
    }
  }
  
  return order;
}

async function orderParticipantsWithBotsLast(participants: string[]): Promise<string[]> {
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
}

export default function TurnBasedMarketplace({ league, onUpdate }: TurnBasedMarketplaceProps) {
  const { user } = useAuth();
  const [currentTurn, setCurrentTurn] = useState<CurrentMarketplaceTurn | null>(null);
  const [turnHistory, setTurnHistory] = useState<MarketplaceTurn[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<ChessPlayer | null>(null);
  const [showBuyConfirmation, setShowBuyConfirmation] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEndMarketplaceButton, setShowEndMarketplaceButton] = useState(false);
  const [isCurrentTurnBot, setIsCurrentTurnBot] = useState(false);
  const [currentPlayerName, setCurrentPlayerName] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [lastActionTime, setLastActionTime] = useState(0);
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<ChessPlayer | null>(null);
  const [showLeaveDraftConfirm, setShowLeaveDraftConfirm] = useState(false);
  
  
  // Add state for draft completed - check both league state and marketplace order
  const [marketplaceDraftCompleted, setMarketplaceDraftCompleted] = useState(
    isTeamBuildingComplete(league)
  );

  // Use the new data hook
  const {
    availablePlayers,
    userTeam,
    userCoinBalance,
    loading: dataLoading,
    error: dataError,
    refresh: refreshData,
    refreshAvailablePlayers,
    invalidateCache
  } = useMarketplaceData(league.id, user?.id);

  // Local state for UI interactions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const botProcessingRef = useRef(false);
  const syncInProgressRef = useRef(false);
  const skipExpiredRef = useRef(false);
  const skipFailedRef = useRef(false);
  const [turnMsRemaining, setTurnMsRemaining] = useState<number | null>(null);
  const [fiveMinuteIdsVersion, setFiveMinuteIdsVersion] = useState(0);

  const isOwner = user?.id && league && user.id === league?.creator_id;
  const isUserTurn = currentTurn?.current_user_id === user?.id;
  const isUserInDraft = !!user?.id && (league.marketplace_order || []).includes(user.id);
  const maxPlayers = league.max_players_per_team || 10;
  const userTeamSize = userTeam.length;
  const canBuy = userTeamSize < maxPlayers;

  const getFundedParticipants = async (excludeId?: string): Promise<string[]> => {
    const withdrawn = new Set(league.marketplace_withdrawn_ids || []);
    const memberIds = (league.member_ids || []).filter(
      id => id !== excludeId && !withdrawn.has(id)
    );

    const { data: balances, error: balancesError } = await supabase
      .from('league_coin_balances')
      .select('user_id, bot_id, coin_balance')
      .eq('league_id', league.id);

    if (balancesError) {
      console.error('Error loading league coin balances:', balancesError);
      return memberIds;
    }

    return memberIds.filter(memberId => {
      const balance = balances?.find(row => row.user_id === memberId || row.bot_id === memberId);
      return !balance || (balance.coin_balance || 0) > 0;
    });
  };

  // Helper: Check if marketplace is open (Wednesday 1 AM to Monday 11:59 PM PT)
  function isMarketplaceOpen() {
    // TEMPORARILY DISABLED: Always return true to keep marketplace open
    return true;
    
    // Original logic (commented out for now):
    // const now = new Date();
    // const nowPT = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    // const day = nowPT.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    // const hour = nowPT.getHours();
    // // Open: Wed 1:00 AM (day=3, hour>=1) through Mon 11:59 PM (day=1, hour<=23)
    // if (day === 3 && hour >= 1) return true; // Wednesday after 1 AM
    // if (day > 3 && day <= 6) return true; // Thursday, Friday, Saturday
    // if (day === 0) return true; // Sunday
    // if (day === 1 && hour <= 23) return true; // Monday all day
    // return false;
  }



  // Load turn history when league changes
  useEffect(() => {
    if (league?.id) {
      loadTurnHistory();
    }
  }, [league?.id]);

  useEffect(() => {
    void loadFiveMinuteDraftLeagueIds().then(() => {
      setFiveMinuteIdsVersion((version) => version + 1);
    });
  }, []);



  // Separate useEffect for turn-specific updates (only when turn changes)
  useEffect(() => {
    if (league?.id && !league.marketplace_completed) {
      loadCurrentTurn();
      refreshAvailablePlayers();
    }
  }, [league?.current_marketplace_turn, refreshAvailablePlayers]);


  // Initialize marketplace order if it is missing. Once the draft starts, marketplace_order
  // may intentionally be a subset of member_ids because broke or withdrawn players are removed from turns.
  useEffect(() => {
    const initializeMarketplaceOrder = async () => {
      if (!league?.id || !league.marketplace_started || league.marketplace_completed || !league.marketplace_order || !league.member_ids || syncInProgressRef.current) {
        return;
      }

      const currentOrder = league.marketplace_order || [];
      const withdrawn = new Set(league.marketplace_withdrawn_ids || []);
      const memberIds = (league.member_ids || []).filter(id => !withdrawn.has(id));
      
      if (currentOrder.length === 0 && memberIds.length > 0) {
        syncInProgressRef.current = true; // Prevent endless loop
        // Handle case where marketplace order is empty but member_ids has participants
        console.log('🔄 Marketplace order is empty but member_ids has participants, regenerating...');
        console.log('Current member_ids:', memberIds);
        
        // Regenerate marketplace order using current member_ids
        const orderedParticipants = await orderParticipantsWithBotsLast(memberIds);
        const newMarketplaceOrder = generateSnakeDraftOrder(orderedParticipants, SNAKE_DRAFT_ROUNDS);
        
        supabase
          .from('leagues')
          .update({
            marketplace_order: newMarketplaceOrder,
            current_marketplace_turn: 0,
          })
          .eq('id', league.id)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error('Error updating marketplace order:', updateError);
              syncInProgressRef.current = false; // Reset flag on error
              return;
            }
            
            console.log('✅ Marketplace order regenerated from empty state:', newMarketplaceOrder);
            // Update local state and refresh data instead of page reload
            syncInProgressRef.current = false;
            invalidateCache(league.id);
            if (user?.id) invalidateCache(user.id);
            refreshData();
            onUpdate();
          });
      }
    };

    initializeMarketplaceOrder();
  }, [league?.id]); // Only run when league ID changes (component first loads)

  // Additional useEffect to handle marketplace start
  useEffect(() => {
    if (league?.marketplace_started && !league.marketplace_completed && !currentTurn) {
      // Marketplace just started, load the current turn with a small delay to ensure data is updated
      const timer = setTimeout(() => {
        loadCurrentTurn();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [league?.marketplace_started, league?.marketplace_completed, currentTurn]);

  // Separate useEffect for marketplace completion state
  useEffect(() => {
    setMarketplaceDraftCompleted(isTeamBuildingComplete(league));
  }, [league]);

  const skipExpiredTurns = async () => {
    if (
      skipExpiredRef.current ||
      skipFailedRef.current ||
      !league?.id ||
      !league.marketplace_started ||
      league.marketplace_completed
    ) {
      return;
    }

    skipExpiredRef.current = true;
    try {
      const { error: skipError } = await supabase.rpc('skip_expired_marketplace_turns', {
        p_timeout_hours: getMarketplaceTurnTimeoutHours(league),
        p_league_id: league.id,
      });
      if (skipError) {
        console.error('Error skipping expired marketplace turns:', skipError);
        skipFailedRef.current = true;
        return;
      }
      skipFailedRef.current = false;
      invalidateCache(league.id);
      if (user?.id) invalidateCache(user.id);
      refreshData();
      await notifyMarketplaceTurnIfNeeded(league.id);
      onUpdate();
    } finally {
      setTimeout(() => {
        skipExpiredRef.current = false;
      }, 2000);
    }
  };

  useEffect(() => {
    if (!league?.marketplace_started || league.marketplace_completed) {
      setTurnMsRemaining(null);
      return;
    }

    skipFailedRef.current = false;
    const tick = () => {
      const remaining = getMarketplaceTurnMsRemaining(
        league.marketplace_turn_started_at,
        Date.now(),
        league
      );
      setTurnMsRemaining(remaining);
      if (remaining !== null && remaining <= 0) {
        void skipExpiredTurns();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [
    league?.id,
    league?.marketplace_started,
    league?.marketplace_completed,
    league?.marketplace_turn_started_at,
    league?.current_marketplace_turn,
    fiveMinuteIdsVersion,
  ]);

  useEffect(() => {
    if (!league?.id || !league.marketplace_started) {
      return;
    }
    void notifyMarketplaceStartedIfNeeded(league.id);
  }, [league?.id, league?.marketplace_started]);

  useEffect(() => {
    if (!league?.id || !league.marketplace_started || league.marketplace_completed) {
      return;
    }
    void notifyMarketplaceTurnIfNeeded(league.id);
  }, [league?.id, league?.marketplace_started, league?.marketplace_completed, league?.current_marketplace_turn]);

  // Check if only one human player remains
  useEffect(() => {
    const checkIfOnlyHumanRemains = async () => {
      if (!league?.member_ids || league.marketplace_completed) {
        setShowEndMarketplaceButton(false);
        return;
      }

      const memberIds = league.member_ids || [];
      if (memberIds.length <= 1) {
        const remainingMember = memberIds[0];
        if (remainingMember && remainingMember === user?.id) {
          // Check if this is a human user (not a bot)
          const { data: botData } = await supabase
            .from('bots')
            .select('id')
            .eq('id', remainingMember)
            .maybeSingle();
          
          if (!botData) {
            // Only human player remains
            setShowEndMarketplaceButton(true);
          } else {
            setShowEndMarketplaceButton(false);
          }
        } else {
          setShowEndMarketplaceButton(false);
        }
      } else {
        setShowEndMarketplaceButton(false);
      }
    };

    checkIfOnlyHumanRemains();
  }, [league?.member_ids, league?.marketplace_completed, user?.id]);

  // Check if current turn is a bot's turn
  useEffect(() => {
    const checkIfCurrentTurnIsBot = async () => {
      if (!currentTurn?.current_user_id) {
        setIsCurrentTurnBot(false);
        return;
      }

      const { data: botData } = await supabase
        .from('bots')
        .select('id')
        .eq('id', currentTurn.current_user_id)
        .maybeSingle();

      setIsCurrentTurnBot(!!botData);
    };

    checkIfCurrentTurnIsBot();
  }, [currentTurn?.current_user_id]);

  // Auto-fix marketplace order only when it contains IDs that are no longer league members.
  // Do not add missing member_ids back into the order; those players may be out of coins.
  useEffect(() => {
    const repairMarketplaceOrder = async () => {
      if (!league?.id || !league.marketplace_started || league.marketplace_completed || !league.marketplace_order || !league.member_ids || syncInProgressRef.current) {
        return;
      }

      const currentOrder = league.marketplace_order || [];
      const memberIds = league.member_ids || [];
      
      const memberSet = new Set(memberIds);
      const fundedParticipantIds = await getFundedParticipants();
      const fundedSet = new Set(fundedParticipantIds);
      const activeParticipantIds = Array.from(new Set(currentOrder));
      const hasInvalidMembers = currentOrder.some(id => !memberSet.has(id));
      const hasUnfundedParticipants = activeParticipantIds.some(id => !fundedSet.has(id));
      const isMissingFundedParticipants = fundedParticipantIds.some(id => !activeParticipantIds.includes(id));
      
      if (hasInvalidMembers || hasUnfundedParticipants || isMissingFundedParticipants) {
        syncInProgressRef.current = true; // Prevent endless loop
        console.log('🔄 Marketplace order active participants need repair...');
        console.log('Current marketplace order:', currentOrder);
        console.log('Current member_ids:', memberIds);
        console.log('Funded participant IDs:', fundedParticipantIds);
        
        const orderedParticipants = await orderParticipantsWithBotsLast(fundedParticipantIds);
        const newMarketplaceOrder = generateSnakeDraftOrder(orderedParticipants, SNAKE_DRAFT_ROUNDS);
        const preservedTurn = preserveMarketplaceTurn(
          currentOrder,
          league.current_marketplace_turn ?? 0,
          newMarketplaceOrder
        );
        
        supabase
          .from('leagues')
          .update({
            marketplace_order: newMarketplaceOrder,
            current_marketplace_turn: preservedTurn,
          })
          .eq('id', league.id)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error('Error updating marketplace order:', updateError);
              syncInProgressRef.current = false; // Reset flag on error
              return;
            }

            console.log('✅ Marketplace order auto-fixed:', newMarketplaceOrder);
            syncInProgressRef.current = false;
            onUpdate();
          });
      }
    };

    repairMarketplaceOrder();
  }, [league?.id, league?.marketplace_started, league?.marketplace_order, league?.member_ids, league?.marketplace_withdrawn_ids]);

  // Simplified bot processing - only when it's actually a bot's turn
  useEffect(() => {
    const processBotTurn = async () => {
      if (!currentTurn || !league?.id || league.marketplace_completed || botProcessingRef.current || syncInProgressRef.current) {
        return;
      }

      // Check if current user is a bot
      const { data: botData } = await supabase
        .from('bots')
        .select('id')
        .eq('id', currentTurn.current_user_id)
        .maybeSingle();
      
      if (botData) {
        botProcessingRef.current = true;
        console.log('🤖 Bot turn detected, processing...');
        
        // Check bot's coin balance first
        const { data: botCoinData } = await supabase
          .from('league_coin_balances')
          .select('coin_balance')
          .eq('bot_id', currentTurn.current_user_id)
          .eq('league_id', league.id)
          .single();

        const botCoinBalance = botCoinData?.coin_balance || 0;
        
        if (botCoinBalance <= 0) {
          // Bot has 0 coins, remove from draft
          console.log('🤖 Bot has 0 coins, removing from draft...');
          await removeBotFromDraft(currentTurn.current_user_id);
          botProcessingRef.current = false;
          return;
        }
          
        try {
          const result = await autoMarketplaceForBot(currentTurn.current_user_id, league.id);
          if (result.success) {
            console.log('🤖 Bot turn completed successfully:', result.data);
            
            // Check if bot has 0 coins after purchase
            const { data: updatedbotCoinData } = await supabase
              .from('league_coin_balances')
              .select('coin_balance')
              .eq('bot_id', currentTurn.current_user_id)
              .eq('league_id', league.id)
              .single();
            
            const updatedbotCoinBalance = updatedbotCoinData?.coin_balance || 0;
            
            if (updatedbotCoinBalance <= 0) {
              // Bot has 0 coins after purchase, remove from draft
              console.log('🤖 Bot has 0 coins after purchase, removing from draft...');
              await removeBotFromDraft(currentTurn.current_user_id);
            } else {
              // Bot still has coins, advance turn
              await advanceTurn();
            }
            
            onUpdate();
          } else {
            console.log('⏳ Bot turn not ready yet - Edge Function returned 400 (this is normal)');
          }
        } catch (error) {
          console.log('⏳ Bot turn not ready yet - Edge Function returned 400 (this is normal)');
        } finally {
          // Reset flag after a short delay
          setTimeout(() => {
            botProcessingRef.current = false;
          }, 2000);
        }
      }
    };

    processBotTurn();
  }, [currentTurn, league?.id, league?.marketplace_completed]);

  // Remove the auto-skip useEffect entirely

  const loadCurrentTurn = async () => {
    try {
      console.log('🔄 Loading current turn...');
      
      // Fetch the latest league data to get current turn info
      const { data: latestLeague, error: leagueError } = await supabase
        .from('leagues')
        .select('marketplace_completed, current_marketplace_turn, marketplace_order')
        .eq('id', league.id)
        .single();

      if (leagueError) {
        console.error('Error fetching latest league data:', leagueError);
        return;
      }

      console.log('📊 Latest league data:', {
        marketplace_completed: latestLeague.marketplace_completed,
        current_marketplace_turn: latestLeague.current_marketplace_turn,
        marketplace_order_length: latestLeague.marketplace_order?.length
      });

      // Don't process if marketplace is already completed
      if (latestLeague.marketplace_completed) {
        console.log('✅ Marketplace completed, not loading turn');
        return;
      }
      
      // Calculate current turn info from latest league data
      if (latestLeague.marketplace_order && latestLeague.marketplace_order.length > 0) {
        const currentTurnIndex = latestLeague.current_marketplace_turn || 0;
        const currentUserId = latestLeague.marketplace_order[currentTurnIndex];
        
        console.log('🎯 Setting current turn:', {
          currentUserId,
          turnIndex: currentTurnIndex,
          totalTurns: latestLeague.marketplace_order.length
        });
        
        if (currentUserId) {
          setCurrentTurn({
            current_user_id: currentUserId,
            turn_number: currentTurnIndex,
            total_turns: latestLeague.marketplace_order.length,
            is_completed: false,
            user_team_size: 0 // Will be calculated separately
          });
          
          // Fetch the current player's name
          try {
            const { data: botData } = await supabase
              .from('bots')
              .select('name')
              .eq('id', currentUserId)
              .maybeSingle();
            
            if (botData) {
              setCurrentPlayerName(botData.name);
            } else {
              // It's a human user, get their username
              const { data: userData } = await supabase
                .from('users')
                .select('username')
                .eq('id', currentUserId)
                .maybeSingle();
              
              setCurrentPlayerName(userData?.username || 'Unknown Player');
            }
          } catch (error) {
            console.error('Error fetching current player name:', error);
            setCurrentPlayerName('Unknown Player');
          }
        } else {
          console.log('❌ No current user ID found, setting turn to null');
          setCurrentTurn(null);
          setCurrentPlayerName('');
        }
      } else {
        console.log('❌ No marketplace order found, setting turn to null');
        setCurrentTurn(null);
      }
    } catch (err) {
      console.error('Error loading current turn:', err);
      setCurrentTurn(null);
    }
  };






  const loadTurnHistory = async () => {
    // For now, we'll skip loading turn history since the table might not exist
    // This can be implemented later if needed
    setTurnHistory([]);
  };

  const startMarketplace = async () => {
    if (!isOwner) return;
    
    try {
      setLoading(true);
      setError(null);

      // Get all league members (users and bots) from leagues.member_ids
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('member_ids')
        .eq('id', league.id)
        .single();

      if (leagueError) {
        console.error('Failed to fetch league data:', leagueError);
        throw leagueError;
      }

      if (!leagueData.member_ids || leagueData.member_ids.length < 2) {
        console.error('Not enough participants for snake draft. Need at least 2, got:', leagueData.member_ids?.length);
        setError('Need at least 2 league members to start a snake draft');
        return;
      }
      
      // Use the member_ids array directly (this should include bots if they were added properly)
      const participantIds = await orderParticipantsWithBotsLast(leagueData.member_ids);
      console.log('Marketplace participants:', participantIds);
      const fullDraftOrder = generateSnakeDraftOrder(participantIds, SNAKE_DRAFT_ROUNDS);
      
      // Update league with marketplace settings
      const { error } = await supabase
        .from('leagues')
        .update({
          marketplace_started: true,
          marketplace_start_time: new Date().toISOString(),
          marketplace_order: fullDraftOrder,
          current_marketplace_turn: 0,
          marketplace_completed: false
        })
        .eq('id', league.id);
      
      if (error) {
        console.error('Failed to start marketplace:', error);
        throw error;
      }

      await notifyMarketplaceStartedIfNeeded(league.id);
      onUpdate();
    } catch {
      console.error('Failed to start marketplace');
      setError('Failed to start marketplace');
    } finally {
      setLoading(false);
    }
  };


  const buyPlayer = async (playerId: string, price: number) => {
    if (!isUserTurn || !canBuy || !user?.id || dataLoading) return;

    // Prevent rapid clicks (debounce)
    const now = Date.now();
    if (now - lastActionTime < 2000) { // 2 second cooldown
      return;
    }
    setLastActionTime(now);

    try {
      setError(null);

      // Fetch the current team row
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, player_ids')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .single();

      if (teamError) {
        console.error('❌ Team fetch error:', teamError);
        throw teamError;
      }

      if ((team.player_ids || []).includes(playerId)) {
        setError('You already own this player');
        return;
      }

      const { data: claim, error: claimError } = await supabase
        .from('league_player_ownership')
        .select('player_id')
        .eq('league_id', league.id)
        .eq('player_id', playerId)
        .maybeSingle();

      if (!claimError && claim) {
        setError('This player was just taken by another manager.');
        refreshData();
        return;
      }

      // Add the new player to the array
      const newPlayerIds = [...(team.player_ids || []), playerId];

      // Update the team row
      const { error: updateError } = await supabase
        .from('teams')
        .update({ player_ids: newPlayerIds })
        .eq('id', team.id);

      if (updateError) {
        if (isPlayerAlreadyOwnedError(updateError)) {
          setError('This player was just taken by another manager.');
          refreshData();
          return;
        }
        console.error('❌ Team update error:', updateError);
        throw updateError;
      }

      // Deduct coins from user's balance
      const { error: gemError } = await supabase
        .from('league_coin_balances')
        .update({ 
          coin_balance: userCoinBalance - price,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('league_id', league.id);

      if (gemError) {
        console.error('❌ gem deduction error:', gemError);
        throw gemError;
      }

      // Close the confirmation modal immediately
      setShowBuyConfirmation(false);
      setSelectedPlayer(null);
      
      // Check if user has 0 coins after purchase
      const newgemBalance = userCoinBalance - price;
      
      if (newgemBalance <= 0) {
        // Remove user from draft entirely
        console.log('💰 User has 0 coins, removing from draft...');
        await removeUserFromDraft(user.id);
        
        // Update turn state after user removal
        await loadCurrentTurn();
        onUpdate();
        return;
      }
      
      // Advance to next turn immediately, or complete if this was the last turn.
      const newTurnIndex = (league.current_marketplace_turn || 0) + 1;
      const marketplaceOrderLength = league.marketplace_order?.length || 0;
      const marketplaceComplete = marketplaceOrderLength > 0 && newTurnIndex >= marketplaceOrderLength;
      const { error: turnError } = await supabase
        .from('leagues')
        .update({ 
          current_marketplace_turn: newTurnIndex,
          marketplace_completed: marketplaceComplete,
          draft_completed: marketplaceComplete ? true : league.draft_completed
        })
        .eq('id', league.id);

      if (turnError) {
        console.error('❌ Turn advancement error:', turnError);
        throw turnError;
      }

      console.log('✅ Turn advanced to next player');

      const nextUserId = league.marketplace_order?.[newTurnIndex];
      
      if (nextUserId) {
        setCurrentTurn({
          current_user_id: nextUserId,
          turn_number: newTurnIndex,
          total_turns: league.marketplace_order?.length || 0,
          is_completed: false,
          user_team_size: 0
        });
        
        // Fetch the next player's name immediately
        try {
          const { data: botData } = await supabase
            .from('bots')
            .select('name')
            .eq('id', nextUserId)
            .maybeSingle();
          
          if (botData) {
            setCurrentPlayerName(botData.name);
          } else {
            // It's a human user, get their username
            const { data: userData } = await supabase
              .from('users')
              .select('username')
              .eq('id', nextUserId)
              .maybeSingle();
            
            setCurrentPlayerName(userData?.username || 'Unknown Player');
          }
        } catch (error) {
          console.error('Error fetching next player name:', error);
          setCurrentPlayerName('Unknown Player');
        }
      } else {
        setCurrentTurn(null);
        setCurrentPlayerName('');
      }

      // Immediate UI update to show turn change
      invalidateCache(league.id);
      if (user?.id) invalidateCache(user.id);
      refreshData();
      
      // Also call loadCurrentTurn to ensure consistency (with small delay for DB replication)
      setTimeout(async () => {
        await loadCurrentTurn();
      }, 100);
      
      onUpdate();

      // Check if marketplace ended after this purchase
      const { data: updatedLeague } = await supabase
        .from('leagues')
        .select('marketplace_completed, current_marketplace_turn, marketplace_order, member_ids')
        .eq('id', league.id)
        .single();

      if (updatedLeague?.marketplace_completed) {
        // Marketplace ended - show completion popup
        showMarketplaceCompletionPopup();
      } else {
        // Check if only bot remains
        const remainingMembers = Array.from(
          new Set((updatedLeague?.marketplace_order || []) as string[])
        );
        const { data: remainingBots } = remainingMembers.length > 0
          ? await supabase
              .from('bots')
              .select('id')
              .in('id', remainingMembers)
          : { data: [] };
        
        if (remainingMembers.length === 1 && (remainingBots?.length || 0) === 1) {
          // Only bot remains - make bot finish turn and close marketplace
          console.log('🤖 Only bot remains, finishing bot turn and closing marketplace...');
          await finishBotTurnAndCloseMarketplace();
        } else {
          // Check if next turn is bot's turn
          const nextTurnIndex = updatedLeague?.current_marketplace_turn || 0;
          const nextUserId = updatedLeague?.marketplace_order?.[nextTurnIndex];
          
          if (nextUserId) {
            const { data: botData } = await supabase
              .from('bots')
              .select('id')
              .eq('id', nextUserId)
              .maybeSingle();
            
            if (botData) {
              // Next turn is bot's turn - bot chooses immediately
              console.log('🤖 Next turn is bot, bot choosing immediately...');
              console.log('🤖 Bot ID:', nextUserId, 'League ID:', league.id);
              await processBotTurnImmediately(nextUserId);
            } else {
              console.log('🤖 Next turn is not a bot, nextUserId:', nextUserId);
            }
          }
        }
      }
      
    } catch {
      console.error('Error buying player');
      setError('Failed to buy player');
    } finally {
      setLoading(false);
    }
  };






  // Function to just advance the turn (for auto-skip)
  const advanceTurn = async () => {
    if (!league?.id || loading) return;
    
    setLoading(true);
    try {
      const currentTurnIndex = league.current_marketplace_turn || 0;
      const marketplaceOrder = league.marketplace_order || [];
      const nextTurnIndex = currentTurnIndex + 1;
      const marketplaceComplete = marketplaceOrder.length > 0 && nextTurnIndex >= marketplaceOrder.length;
      
      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          current_marketplace_turn: nextTurnIndex,
          marketplace_completed: marketplaceComplete,
          draft_completed: marketplaceComplete ? true : league.draft_completed,
        })
        .eq('id', league.id);
      
      if (updateError) {
        console.error('Error advancing turn:', updateError);
        throw updateError;
      }
      
      console.log('✅ Turn advanced from', currentTurnIndex, 'to', nextTurnIndex);
      
      // Update currentTurn state immediately to reflect the change
      const nextUserId = marketplaceOrder[nextTurnIndex];
      if (nextUserId) {
        setCurrentTurn({
          current_user_id: nextUserId,
          turn_number: nextTurnIndex,
          total_turns: marketplaceOrder.length,
          is_completed: false,
          user_team_size: 0
        });
        
        // Fetch the next player's name immediately
        try {
          const { data: botData } = await supabase
            .from('bots')
            .select('name')
            .eq('id', nextUserId)
            .maybeSingle();
          
          if (botData) {
            setCurrentPlayerName(botData.name);
          } else {
            // It's a human user, get their username
            const { data: userData } = await supabase
              .from('users')
              .select('username')
              .eq('id', nextUserId)
              .maybeSingle();
            
            setCurrentPlayerName(userData?.username || 'Unknown Player');
          }
        } catch (error) {
          console.error('Error fetching next player name:', error);
          setCurrentPlayerName('Unknown Player');
        }
      } else {
        setCurrentTurn(null);
        setCurrentPlayerName('');
      }
      
      // Single smooth update
      invalidateCache(league.id);
      if (user?.id) invalidateCache(user.id);
      refreshData();
      onUpdate();
    } catch (err) {
      console.error('Error advancing turn:', err);
      setError('Failed to advance turn');
    } finally {
      setLoading(false);
    }
  };

  // Function to remove user from the active marketplace draft without leaving the league.
  const removeUserFromDraft = async (userId: string) => {
    try {
      const currentOrder = league.marketplace_order || [];
      const activeParticipantIds = await orderParticipantsWithBotsLast(
        await getFundedParticipants(userId)
      );
      
      // Regenerate marketplace order without the user, but keep permanent member_ids unchanged.
      const newMarketplaceOrder = generateSnakeDraftOrder(activeParticipantIds, SNAKE_DRAFT_ROUNDS);
      const preservedTurn = preserveMarketplaceTurn(
        currentOrder,
        league.current_marketplace_turn ?? 0,
        newMarketplaceOrder
      );
      
      // Update only marketplace state. member_ids is permanent league membership.
      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          marketplace_order: newMarketplaceOrder,
          current_marketplace_turn: preservedTurn
        })
        .eq('id', league.id);
      
      if (updateError) {
        console.error('Error removing user from draft:', updateError);
        throw updateError;
      }

      console.log('✅ User removed from active draft');
      
      // Check if marketplace should end after user removal
      const { data: updatedLeague } = await supabase
        .from('leagues')
        .select('marketplace_completed, marketplace_order')
        .eq('id', league.id)
        .single();
      
      const remainingMembers = Array.from(
        new Set((updatedLeague?.marketplace_order || []) as string[])
      );
      
      if (remainingMembers.length <= 1) {
        // Check if the remaining member is a bot
        const remainingMember = remainingMembers[0];
        if (remainingMember) {
          const { data: botData } = await supabase
            .from('bots')
            .select('id')
            .eq('id', remainingMember)
            .maybeSingle();
          
          if (botData) {
            // Only bot remains - let bot finish its turn first
            console.log('🤖 Only bot remains, letting bot finish turn before ending marketplace...');
            await finishBotTurnAndCloseMarketplace(remainingMember);
          } else {
            // Only human player remains - don't auto-close, let them decide when to end
            console.log('👤 Only human player remains - marketplace stays open for them to decide when to end');
          }
        } else {
          // No members left, end marketplace
          console.log('🏁 Marketplace ending - no participants');
          await supabase
            .from('leagues')
            .update({ marketplace_completed: true, draft_completed: true })
            .eq('id', league.id);
        }
      }
      
      // Single smooth update
      invalidateCache(league.id);
      if (user?.id) invalidateCache(user.id);
      refreshData();
      onUpdate();
    } catch (err) {
      console.error('Error removing user from draft:', err);
      setError('Failed to remove user from draft');
    }
  };

  const finishDraftAfterWithdrawal = async (
    remainingOrder: string[],
    nextTurn: number,
    draftCompleted: boolean
  ) => {
    const remainingMembers = Array.from(new Set(remainingOrder));
    const shouldCompleteDraft = draftCompleted || remainingMembers.length < 2;

    if (shouldCompleteDraft) {
      if (!draftCompleted) {
        await supabase
          .from('leagues')
          .update({ marketplace_completed: true, draft_completed: true })
          .eq('id', league.id);
        onUpdate();
      }
      showMarketplaceCompletionPopup();
      return;
    }

    const nextPicker = remainingOrder[nextTurn];
    if (!nextPicker) return;

    const { data: botData } = await supabase
      .from('bots')
      .select('id')
      .eq('id', nextPicker)
      .maybeSingle();
    if (botData) {
      await processBotTurnImmediately(nextPicker);
    }
  };

  const leaveDraft = async () => {
    if (!user?.id || !league?.id || loading) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: withdrawError } = await supabase.rpc('withdraw_from_marketplace_draft', {
        p_league_id: league.id,
      });

      if (withdrawError) {
        throw withdrawError;
      }

      setShowLeaveDraftConfirm(false);

      const remainingOrder = (data?.marketplace_order || []) as string[];
      const nextTurn = typeof data?.current_marketplace_turn === 'number'
        ? data.current_marketplace_turn
        : 0;
      const draftCompleted = !!data?.marketplace_completed;

      invalidateCache(league.id);
      if (user.id) invalidateCache(user.id);
      refreshData();
      await loadCurrentTurn();
      onUpdate();
      await notifyMarketplaceTurnIfNeeded(league.id);
      await finishDraftAfterWithdrawal(remainingOrder, nextTurn, draftCompleted);
    } catch {
      console.error('Error leaving draft');
      setError('Failed to leave the draft');
    } finally {
      setLoading(false);
    }
  };

  // Function to remove bot from the active marketplace draft without deleting league membership.
  const removeBotFromDraft = async (botId: string) => {
    try {
      const currentOrder = league.marketplace_order || [];
      const activeParticipantIds = await orderParticipantsWithBotsLast(
        await getFundedParticipants(botId)
      );
      
      // Regenerate marketplace order without the bot
      const newMarketplaceOrder = generateSnakeDraftOrder(activeParticipantIds, SNAKE_DRAFT_ROUNDS);
      const preservedTurn = preserveMarketplaceTurn(
        currentOrder,
        league.current_marketplace_turn ?? 0,
        newMarketplaceOrder
      );
      
      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          marketplace_order: newMarketplaceOrder,
          current_marketplace_turn: preservedTurn,
        })
        .eq('id', league.id);
      
      if (updateError) {
        console.error('Error removing bot from draft:', updateError);
        throw updateError;
      }

      console.log('✅ Bot removed from active draft');
      
      // Check if marketplace should end after bot removal
      const { data: updatedLeague } = await supabase
        .from('leagues')
        .select('marketplace_completed, marketplace_order')
        .eq('id', league.id)
        .single();
      
      const remainingMembers = Array.from(
        new Set((updatedLeague?.marketplace_order || []) as string[])
      );
      
      if (remainingMembers.length <= 1) {
        // Check if the remaining member is a bot
        const remainingMember = remainingMembers[0];
        if (remainingMember) {
          const { data: botData } = await supabase
            .from('bots')
            .select('id')
            .eq('id', remainingMember)
            .maybeSingle();
          
          if (botData) {
            // Only bot remains - let bot finish its turn first
            console.log('🤖 Only bot remains, letting bot finish turn before ending marketplace...');
            await finishBotTurnAndCloseMarketplace(remainingMember);
          } else {
            // Only human player remains - don't auto-close, let them decide when to end
            console.log('👤 Only human player remains - marketplace stays open for them to decide when to end');
          }
        } else {
          // No members left, end marketplace
          console.log('🏁 Marketplace ending - no participants');
          await supabase
            .from('leagues')
            .update({ marketplace_completed: true, draft_completed: true })
            .eq('id', league.id);
        }
      }
      
      // Single smooth update
      invalidateCache(league.id);
      if (user?.id) invalidateCache(user.id);
      refreshData();
      onUpdate();
    } catch (err) {
      console.error('Error removing bot from draft:', err);
      setError('Failed to remove bot from draft');
    }
  };

  // Function to finish bot turn and close marketplace
  const finishBotTurnAndCloseMarketplace = async (botId?: string) => {
    try {
      // Get the bot ID - either passed as parameter or from remaining members
      let targetBotId = botId;
      if (!targetBotId) {
        // Find the remaining bot from member_ids
        const remainingMembers = league.member_ids || [];
        for (const memberId of remainingMembers) {
          const { data: botData } = await supabase
            .from('bots')
            .select('id')
            .eq('id', memberId)
            .maybeSingle();
          if (botData) {
            targetBotId = memberId;
            break;
          }
        }
      }
      
      if (!targetBotId) {
        console.log('🤖 No bot found to finish turn');
        return;
      }
      
      console.log('🤖 Finishing bot turn for bot ID:', targetBotId);
      // Make bot finish its turn
      const result = await autoMarketplaceForBot(targetBotId, league.id);
      
      if (result.success) {
        console.log('🤖 Bot finished turn successfully:', result.data);
      } else {
        console.log('🤖 Bot turn not ready yet (expected behavior)');
      }
      
      // Close marketplace
      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          marketplace_completed: true,
          draft_completed: true,
        })
        .eq('id', league.id);
      
      if (updateError) {
        console.error('Error closing marketplace:', updateError);
        throw updateError;
      }

      console.log('✅ Marketplace closed after bot finished turn');
      
      // Show completion popup
      showMarketplaceCompletionPopup();
    } catch (err) {
      console.error('Error finishing bot turn and closing marketplace:', err);
      setError('Failed to finish bot turn');
    }
  };

  // Function to process bot turn immediately
  const processBotTurnImmediately = async (botId: string) => {
    try {
      console.log('🤖 processBotTurnImmediately called with botId:', botId, 'leagueId:', league.id);
      const result = await autoMarketplaceForBot(botId, league.id);
      console.log('🤖 autoMarketplaceForBot result:', result);
      
      if (result.success) {
        console.log('🤖 Bot chose immediately:', result.data);
        
        // Check if bot has 0 coins after purchase
        const { data: botCoinData } = await supabase
          .from('league_coin_balances')
          .select('coin_balance')
          .eq('bot_id', botId)
          .eq('league_id', league.id)
          .single();
        
        const botCoinBalance = botCoinData?.coin_balance || 0;
        
        if (botCoinBalance <= 0) {
          // Bot has 0 coins, remove from draft
          console.log('🤖 Bot has 0 coins, removing from draft...');
          await removeBotFromDraft(botId);
        } else {
          // Bot still has coins, advance turn
          await advanceTurn();
        }
        
        // Update UI after bot processing
        invalidateCache(league.id);
        if (user?.id) invalidateCache(user.id);
        refreshData();
        onUpdate();
      } else {
        console.log('🤖 Bot not ready yet (expected behavior)');
      }
    } catch (err) {
      console.error('Error processing bot turn immediately:', err);
    }
  };

  // Function to manually end marketplace (for last human player)
  const endMarketplaceManually = async () => {
    try {
      setLoading(true);
      
      const { error: updateError } = await supabase
        .from('leagues')
        .update({ marketplace_completed: true, draft_completed: true })
        .eq('id', league.id);
      
      if (updateError) {
        console.error('Error ending marketplace:', updateError);
        throw updateError;
      }

      console.log('✅ Marketplace ended manually by last human player');
      
      // Show completion popup
      showMarketplaceCompletionPopup();
      
      // Refresh data
      onUpdate();
    } catch (err) {
      console.error('Error ending marketplace manually:', err);
      setError('Failed to end marketplace');
    } finally {
      setLoading(false);
    }
  };

  // Function to show marketplace completion popup
  const showMarketplaceCompletionPopup = async () => {
    try {
      const { data: bots } = await supabase
        .from('bots')
        .select('id')
        .eq('league_id', league.id)
      
      const botIds = bots?.map(bot => bot.id) || [];
      let botPlayerIds: string[] = [];

      if (botIds.length > 0) {
        const { data: botTeams } = await supabase
          .from('teams')
          .select('player_ids')
          .eq('league_id', league.id)
          .in('bot_id', botIds);

        botPlayerIds = botTeams?.flatMap(team => team.player_ids || []) || [];
      }
      
      const { data: botPlayers } = botPlayerIds.length > 0
        ? await supabase
            .from('chess_players')
            .select('name, elo')
            .in('id', botPlayerIds)
        : { data: [] };

      const botChoices = botPlayers?.map(p => `${p.name} (${p.elo})`) || [];

      // Show inline popup with bot's choices
      const message = `🎉 Marketplace Complete!\n\nBot chose: ${botChoices.join(', ')}\n\nTeams are now finalized and the regular marketplace is now open!`;
      
      setCompletionMessage(message);
      setShowCompletionPopup(true);
      
      // Refresh data to show regular marketplace
      onUpdate();
    } catch (error) {
      console.error('Error showing completion popup:', error);
      // Still refresh data
      onUpdate();
    }
  };


  // Memoized player details lookup

  // Memoized filtered and sorted players
  const filteredPlayers = useMemo(() => {
    return availablePlayers
      .filter(player =>
        player.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const priceA = calculatePlayerPrice(a.elo);
        const priceB = calculatePlayerPrice(b.elo);
        const canAffordA = userCoinBalance !== null && userCoinBalance >= priceA;
        const canAffordB = userCoinBalance !== null && userCoinBalance >= priceB;
        
        // Sort by affordability first (affordable players first)
        if (canAffordA && !canAffordB) return -1;
        if (!canAffordA && canAffordB) return 1;
        
        // Then sort by ELO (highest first)
        return b.elo - a.elo;
      });
  }, [availablePlayers, debouncedSearchTerm, userCoinBalance]);

  if (!league.marketplace_started) {
    const autoStartDate = getMarketplaceAutoStartDate(league.start_date)
    const autoStartDue = isMarketplaceAutoStartDue(league)
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Turn-Based Marketplace</h3>
        <p className="text-gray-600 mb-4">
          The marketplace allows players to take turns buying chess players. Each player can have up to {league.max_players_per_team || 10} players on their team.
        </p>
        <p className="text-gray-600 mb-4">
          {autoStartDue
            ? 'The marketplace is due to start automatically now. It will open as soon as this league has at least 2 members.'
            : `If the owner does not start it sooner, the marketplace will start automatically on ${formatCalendarDate(autoStartDate)} (one week before the league start date).`}
        </p>
        
        {isOwner && (
          <div className="space-y-4">
          <button
            onClick={startMarketplace}
            disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
              {loading ? 'Starting Marketplace...' : 'Start Turn-Based Marketplace'}
          </button>
            {(error || dataError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error || dataError}
              </div>
        )}
          </div>
        )}
        
        {!isOwner && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            {autoStartDue
              ? 'Waiting for the marketplace to start automatically...'
              : `Waiting for the league owner to start the marketplace, or it will start automatically on ${formatCalendarDate(autoStartDate)}.`}
          </div>
        )}
      </div>
    );
  }

  if (isTeamBuildingComplete(league)) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          {league.marketplace_completed ? 'Turn-Based Marketplace Complete!' : 'Turn-Based Marketplace Complete!'}
        </h3>
        <p className="text-gray-600 mb-4">
          {league.marketplace_completed 
            ? 'The turn-based marketplace phase is complete! All players have used their coins to build their teams. You can now set your weekly lineups for the season.'
            : 'All players have completed their turns. The turn-based marketplace is now finished, but the regular marketplace remains open for trading.'
          }
        </p>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">Your Team ({userTeam.length}/{league.max_players_per_team || 10} players)</h4>
          {userTeam.length > 0 ? (
            <div className="space-y-2">
              {userTeam.map(player => (
                <div key={player.id} className="flex justify-between items-center text-sm">
                  <span>{player.name}</span>
                  <span className="text-gray-500">ELO: {player.elo}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No players on your team</p>
          )}
        </div>
        {league.marketplace_completed && (
          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
            <p className="text-sm text-blue-700">
              The marketplace is now closed. You can set your weekly lineups in the League page to start earning points!
            </p>
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Turn-Based Marketplace</h3>
        <div className="text-lg font-semibold text-amber-700 bg-amber-100 px-4 py-2 rounded">
          Coins: {userCoinBalance !== null ? userCoinBalance : '...'} 🪙
        </div>
      </div>

          {/* Current Turn Status */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">Current Turn</h4>
        {league.marketplace_completed ? (
          <div className="space-y-2">
            <p className="text-sm text-green-600 font-semibold">✅ Marketplace Complete!</p>
            <p className="text-sm text-gray-600">All players have run out of coins. The marketplace is now closed.</p>
          </div>
        ) : currentTurn ? (
          <div className="space-y-2">
            <p className="text-sm">
              Turn {currentTurn.turn_number + 1} of {currentTurn.total_turns}
            </p>
            <p className="text-sm">
              {isUserTurn ? (
                <span className="text-green-600 font-semibold">It's your turn!</span>
              ) : (
                <span className="text-gray-600">Waiting on someone else...</span>
              )}
            </p>
            {turnMsRemaining !== null && (
              <p className={`text-sm ${turnMsRemaining <= Math.min(60 * 1000, getMarketplaceTurnTimeoutMs(league) / 2) ? 'text-red-700 font-semibold' : 'text-blue-800'}`}>
                {turnMsRemaining > 0
                  ? `${formatMarketplaceTurnRemaining(turnMsRemaining)} left to pick. After ${getMarketplaceTurnTimeoutLabel(league)} this turn is skipped.`
                  : 'Time is up — skipping this turn...'}
              </p>
            )}
            {isUserTurn && (
              <div className="space-y-2">
              <p className="text-sm">
                Your team: {userTeamSize}/{league.max_players_per_team || 10} players
              </p>
                {userCoinBalance === 0 && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-700 text-sm font-semibold">
                      ⚠️ You have 0 coins! You will be automatically removed from the draft.
                    </p>
                  </div>
            )}
                <button
                  type="button"
                  onClick={() => setShowLeaveDraftConfirm(true)}
                  disabled={loading}
                  className="mt-2 w-full sm:w-auto px-4 py-2 bg-white border border-orange-300 text-orange-800 rounded-md hover:bg-orange-50 disabled:opacity-50 text-sm font-medium"
                >
                  End turn
                </button>
                <p className="text-xs text-orange-700">
                  Leave the rest of the snake draft and keep remaining coins for the regular marketplace.
                </p>
          </div>
            )}
            {!isUserTurn && isUserInDraft && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveDraftConfirm(true)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  Leave draft
                </button>
              </div>
            )}
            {/* Bot turn indicator */}
            {currentTurn && !isUserTurn && isCurrentTurnBot && (
              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                <p className="text-purple-700 text-sm">
                  🤖 Bot's turn - Processing automatically...
                </p>
            <button
                   onClick={() => {
                     const currentUserId = league.marketplace_order?.[league.current_marketplace_turn || 0];
                     if (currentUserId) {
                       console.log('🔄 Manually triggering bot action for:', currentUserId);
                       autoMarketplaceForBot(currentUserId, league.id).then(({ success, error, data }) => {
                         if (success) {
                           console.log('✅ Manual bot action completed:', data?.action);
                           setTimeout(() => onUpdate(), 1000);
                  } else {
                           if (error?.includes('400') || error?.includes('not the bot')) {
                             console.log('⏳ Bot not ready for manual action (expected)');
                           } else {
                             console.error('❌ Manual bot action failed:', error);
                           }
                         }
                       });
                     }
                   }}
                   className="mt-2 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs"
                 >
                   Manual Trigger Bot Action
            </button>
              </div>
          )}

          {/* Human player turn indicator */}
          {currentTurn && !isUserTurn && !isCurrentTurnBot && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-700 text-sm">
                👤 {currentPlayerName}'s turn - Waiting...
              </p>
            </div>
          )}
        </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Loading turn information...</p>
                  </div>
                )}

        {/* Auto-remove info */}
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
          <p className="text-orange-700 font-semibold">💡 Leaving the draft</p>
          <p className="text-orange-600">Use End turn to leave the snake draft even if you still have coins. You stay in the league and can spend leftover coins later in the regular marketplace. Users with 0 coins are removed automatically.</p>
          </div>
        </div>


      {/* User's Turn Actions */}

      {/* Error Message */}
      {(error || dataError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error || dataError}
        </div>
      )}

      {!marketplaceDraftCompleted && user?.id && !isUserInDraft && (league.marketplace_withdrawn_ids || []).includes(user.id) && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded">
          You left the snake draft. Remaining coins stay on your balance for the regular marketplace after the draft ends.
        </div>
      )}

      {/* Available Players */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-gray-900">Available Players</h4>
          <div className="text-sm text-gray-600">
            {filteredPlayers.filter(p => userCoinBalance !== null && userCoinBalance >= calculatePlayerPrice(p.elo)).length} affordable
            {' '}• {filteredPlayers.length} total
          </div>
        </div>
        
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Players List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {dataLoading ? (
            <LoadingSpinner size="lg" text="Loading players..." className="py-8" />
          ) : (
            <StaggeredTransition staggerDelay={50} direction="slideUp">
              {filteredPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  userCoinBalance={userCoinBalance}
                  canBuy={canBuy}
                  isUserTurn={isUserTurn}
                  currencyType="coins"
                  onBuyClick={(player) => {
                          setSelectedPlayer(player);
                          setShowBuyConfirmation(true);
                        }}
                  onPlayerClick={(player) => setSelectedPlayerForModal(player)}
                />
              ))}
            </StaggeredTransition>
          )}
        </div>
      </div>

      {/* User's Team */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">Your Team ({userTeam.length}/{league.max_players_per_team || 10})</h4>
        {userTeam.length > 0 ? (
          <div className="space-y-2">
            {userTeam.map(player => (
              <div key={player.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <span className="font-medium">{player.name}</span>
                  <span className="text-gray-500 ml-2">ELO: {player.elo}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No players on your team yet</p>
        )}
      </div>

      {/* Turn History */}

      {/* Error Message */}
      {(error || dataError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error || dataError}
        </div>
      )}

      {/* Turn History */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Recent Turns</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {turnHistory.map(turn => (
            <div key={turn.id} className="text-sm p-2 bg-gray-50 rounded">
              <span className="font-medium">Turn {turn.turn_number + 1}:</span>{' '}
              <span>{turn.action_type === 'buy' ? `Bought ${turn.player_id ? 'a player' : 'player'} for ${turn.price} coins` : 'Skipped turn'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Buy Confirmation Modal */}
      {showBuyConfirmation && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Purchase</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Player: {selectedPlayer.name}</p>
              <p className="text-sm text-gray-600 mb-2">ELO: {selectedPlayer.elo}</p>
                <p className="text-sm text-gray-600 mb-2">Price: {calculatePlayerPrice(selectedPlayer.elo)} 🪙</p>
                <p className="text-sm text-gray-600 mb-4">Your balance: {userCoinBalance} 🪙</p>
              
              {/* Chess.com Profile Link */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Chess.com Profile:</strong>
                </p>
                <a 
                  href={`https://www.chess.com/member/${selectedPlayer.name.toLowerCase().replace(/\s+/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  View Profile on Chess.com →
                </a>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowBuyConfirmation(false);
                  setSelectedPlayer(null);
                }}
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => buyPlayer(selectedPlayer.id, calculatePlayerPrice(selectedPlayer.elo))}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveDraftConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-3">End turn and leave the draft?</h3>
            <p className="text-sm text-gray-600 mb-3">
              You will not get any more snake-draft picks. If only one manager would remain, the turn-based marketplace ends. You stay in the league, keep players you already bought, and keep remaining coins for the regular marketplace.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Current balance: {userCoinBalance ?? 0} 🪙
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowLeaveDraftConfirm(false)}
                disabled={loading}
                className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void leaveDraft()}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-400"
              >
                {loading ? 'Leaving...' : 'End turn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Open/Closed Message */}
      {!marketplaceDraftCompleted && !isMarketplaceOpen() && (
        <div className="text-red-600 font-semibold mb-2">
          The marketplace is closed. It opens Wednesday 1 AM PT and closes Monday 11:59 PM PT.
        </div>
      )}

      {/* Hide buy/skip/end UI if user has no coins or draft is completed */}
      {(userCoinBalance === 0 || userCoinBalance === null || marketplaceDraftCompleted) && isUserTurn && (
        <div className="text-gray-500 italic">You have no coins remaining or the turn-based marketplace is completed.</div>
      )}

      {/* End Marketplace Button - Show when only human player remains */}
      {showEndMarketplaceButton && isUserTurn && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-orange-800 text-sm mb-3">
            🏁 You're the only player remaining in the marketplace. You can end it whenever you're ready.
          </p>
          <button
            onClick={endMarketplaceManually}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Ending...' : 'End Marketplace'}
          </button>
        </div>
      )}

      {/* Marketplace Completion Modal */}
      {showCompletionPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-green-600">🎉 Marketplace Complete!</h3>
            <div className="mb-4 whitespace-pre-line text-gray-700">
              {completionMessage}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowCompletionPopup(false);
                  setCompletionMessage('');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
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
  );
}
