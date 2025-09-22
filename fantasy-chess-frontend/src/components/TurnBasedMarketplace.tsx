import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { autoMarketplaceForBot } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChessPlayer, League, CurrentMarketplaceTurn, MarketplaceTurn } from '../types';
import { calculatePlayerPrice } from '../types/coin-system';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { useDebounce } from '../hooks/useDebounce';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { StaggeredTransition } from './ui/SmoothTransition';
import PlayerCard from './PlayerCard';

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

export default function TurnBasedMarketplace({ league, onUpdate }: TurnBasedMarketplaceProps) {
  const { user } = useAuth();
  const [currentTurn, setCurrentTurn] = useState<CurrentMarketplaceTurn | null>(null);
  const [turnHistory, setTurnHistory] = useState<MarketplaceTurn[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<ChessPlayer | null>(null);
  const [showBuyConfirmation, setShowBuyConfirmation] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [lastActionTime, setLastActionTime] = useState(0);
  // Add state for draft completed - check both league state and marketplace order
  const [marketplaceDraftCompleted, setMarketplaceDraftCompleted] = useState(
    league.draft_completed || 
    (league.marketplace_order && league.marketplace_order.length === 0)
  );

  // Use the new data hook
  const {
    availablePlayers,
    userTeam,
    userCoinBalance,
    loading: dataLoading,
    error: dataError,
    refresh: refreshData,
    invalidateCache
  } = useMarketplaceData(league.id, user?.id);

  // Local state for UI interactions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const botProcessingRef = useRef(false);
  const syncInProgressRef = useRef(false);

  const isOwner = user?.id && league && user.id === league?.creator_id;
  const isUserTurn = currentTurn?.current_user_id === user?.id;
  const maxPlayers = league.max_players_per_team || 10;
  const userTeamSize = userTeam.length;
  const canBuy = userTeamSize < maxPlayers;

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

  // Separate useEffect for turn-specific updates (only when turn changes)
  useEffect(() => {
    if (league?.id && !league.marketplace_completed) {
      loadCurrentTurn();
    }
  }, [league?.current_marketplace_turn]);


  // Auto-sync marketplace order with member_ids when component first loads
  useEffect(() => {
    if (league?.id && league.marketplace_started && league.marketplace_order && league.member_ids && !syncInProgressRef.current) {
      const currentOrder = league.marketplace_order || [];
      const memberIds = league.member_ids || [];
      
      if (currentOrder.length > 0 && memberIds.length > 0) {
        const orderSet = new Set(currentOrder);
        const memberSet = new Set(memberIds);
        
        // Check if the sets are different (different participants or different counts)
        const isOutOfSync = orderSet.size !== memberSet.size || 
                           !Array.from(orderSet).every(id => memberSet.has(id)) ||
                           !Array.from(memberSet).every(id => orderSet.has(id));

        if (isOutOfSync) {
          syncInProgressRef.current = true; // Prevent endless loop
          console.log('🔄 Marketplace order out of sync with member_ids, regenerating...');
          console.log('Current marketplace order:', currentOrder);
          console.log('Current member_ids:', memberIds);
          
          // Regenerate marketplace order using current member_ids
          const newMarketplaceOrder = generateSnakeDraftOrder(memberIds, 10);
          
          // Update the league with the new marketplace order
          supabase
            .from('leagues')
            .update({
              marketplace_order: newMarketplaceOrder,
              current_marketplace_turn: 0 // Reset to beginning
            })
            .eq('id', league.id)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error('Error updating marketplace order:', updateError);
                syncInProgressRef.current = false; // Reset flag on error
                return;
              }
              
              console.log('✅ Marketplace order regenerated:', newMarketplaceOrder);
              // Update local state and refresh data instead of page reload
              syncInProgressRef.current = false;
              invalidateCache(league.id);
              if (user?.id) invalidateCache(user.id);
              refreshData();
              onUpdate();
            });
        }
      } else if (currentOrder.length === 0 && memberIds.length > 0) {
        syncInProgressRef.current = true; // Prevent endless loop
        // Handle case where marketplace order is empty but member_ids has participants
        console.log('🔄 Marketplace order is empty but member_ids has participants, regenerating...');
        console.log('Current member_ids:', memberIds);
        
        // Regenerate marketplace order using current member_ids
        const newMarketplaceOrder = generateSnakeDraftOrder(memberIds, 10);
        
        // Update the league with the new marketplace order
        supabase
          .from('leagues')
          .update({
            marketplace_order: newMarketplaceOrder,
            current_marketplace_turn: 0 // Reset to beginning
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
    }
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
    setMarketplaceDraftCompleted(
      league.marketplace_completed || 
      league.draft_completed || 
      (league.marketplace_order && league.marketplace_order.length === 0)
    );
  }, [league.marketplace_completed, league.draft_completed, league.marketplace_order]);

  // Auto-fix marketplace order when it's wrong
  useEffect(() => {
    if (league?.id && league.marketplace_started && league.marketplace_order && league.member_ids && !syncInProgressRef.current) {
      const currentOrder = league.marketplace_order || [];
      const memberIds = league.member_ids || [];
      
      // Check if marketplace order only contains one user ID repeated (wrong)
      const uniqueIds = [...new Set(currentOrder)];
      const isWrongOrder = uniqueIds.length === 1 && memberIds.length > 1;
      
      // Also check if marketplace order is missing any member_ids
      const orderSet = new Set(currentOrder);
      const memberSet = new Set(memberIds);
      const isMissingMembers = !Array.from(memberSet).every(id => orderSet.has(id));
      
      if (isWrongOrder || isMissingMembers) {
        syncInProgressRef.current = true; // Prevent endless loop
        console.log('🔄 Marketplace order is wrong, auto-fixing...');
        console.log('Current marketplace order:', currentOrder);
        console.log('Current member_ids:', memberIds);
        console.log('Issue detected:', isWrongOrder ? 'Only one user repeated' : 'Missing members');
        
        // Regenerate marketplace order using current member_ids
        const newMarketplaceOrder = generateSnakeDraftOrder(memberIds, 10);
        
        // Update the league with the new marketplace order
        supabase
          .from('leagues')
          .update({
            marketplace_order: newMarketplaceOrder,
            current_marketplace_turn: 0 // Reset to beginning
          })
          .eq('id', league.id)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error('Error updating marketplace order:', updateError);
              syncInProgressRef.current = false; // Reset flag on error
              return;
            }

            console.log('✅ Marketplace order auto-fixed:', newMarketplaceOrder);
            // Use onUpdate for smooth refresh
            onUpdate();
          });
      }
    }
  }, [league?.id, league?.marketplace_started, league?.marketplace_order, league?.member_ids]); // Run when these change

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
            const { data: updatedBotCoinData } = await supabase
              .from('league_coin_balances')
              .select('coin_balance')
              .eq('bot_id', currentTurn.current_user_id)
              .eq('league_id', league.id)
              .single();
            
            const updatedBotCoinBalance = updatedBotCoinData?.coin_balance || 0;
            
            if (updatedBotCoinBalance <= 0) {
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

      // Don't process if marketplace is already completed
      if (latestLeague.marketplace_completed) {
        return;
      }
      
      // Calculate current turn info from latest league data
      if (latestLeague.marketplace_order && latestLeague.marketplace_order.length > 0) {
        const currentTurnIndex = latestLeague.current_marketplace_turn || 0;
        const currentUserId = latestLeague.marketplace_order[currentTurnIndex];
        
        if (currentUserId) {
          setCurrentTurn({
            current_user_id: currentUserId,
            turn_number: currentTurnIndex,
            total_turns: latestLeague.marketplace_order.length,
            is_completed: false,
            user_team_size: 0 // Will be calculated separately
          });
        } else {
          setCurrentTurn(null);
        }
      } else {
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
      const participantIds = leagueData.member_ids;
      console.log('Marketplace participants:', participantIds);
      const fullDraftOrder = generateSnakeDraftOrder(participantIds, 10);
      
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
      
      onUpdate();
    } catch (err) {
      console.error('Failed to start marketplace:', err);
      setError(`Failed to start marketplace: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

      // Add the new player to the array
      const newPlayerIds = [...(team.player_ids || []), playerId];

      // Update the team row
      const { error: updateError } = await supabase
        .from('teams')
        .update({ player_ids: newPlayerIds })
        .eq('id', team.id);

      if (updateError) {
        console.error('❌ Team update error:', updateError);
        throw updateError;
      }

      // Deduct coins from user's balance
      const { error: coinError } = await supabase
        .from('league_coin_balances')
        .update({ 
          coin_balance: userCoinBalance - price,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('league_id', league.id);

      if (coinError) {
        console.error('❌ Coin deduction error:', coinError);
        throw coinError;
      }

      // Close the confirmation modal immediately
      setShowBuyConfirmation(false);
      setSelectedPlayer(null);
      
      // Check if user has 0 coins after purchase
      const newCoinBalance = userCoinBalance - price;
      
      if (newCoinBalance <= 0) {
        // Remove user from draft entirely
        console.log('💰 User has 0 coins, removing from draft...');
        await removeUserFromDraft(user.id);
        return;
      }
      
      // Advance to next turn immediately
      const { error: turnError } = await supabase
        .from('leagues')
        .update({ 
          current_marketplace_turn: (league.current_marketplace_turn || 0) + 1
        })
        .eq('id', league.id);

      if (turnError) {
        console.error('❌ Turn advancement error:', turnError);
        throw turnError;
      }

      console.log('✅ Turn advanced to next player');

      // Immediate UI update to show turn change
      invalidateCache(league.id);
      if (user?.id) invalidateCache(user.id);
      refreshData();
      
      // Update the current turn state immediately
      await loadCurrentTurn();
      
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
        const remainingMembers = updatedLeague?.member_ids || [];
        const remainingBots = remainingMembers.filter((id: string) => {
          // Check if this ID is a bot
          return league.bot_id === id;
        });
        
        if (remainingMembers.length === 1 && remainingBots.length === 1) {
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
      
    } catch (err: any) {
      console.error('❌ Error buying player:', err);
      console.error('Error details:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      });
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
      const nextTurnIndex = (currentTurnIndex + 1) % marketplaceOrder.length;
      
      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          current_marketplace_turn: nextTurnIndex
        })
        .eq('id', league.id);
      
      if (updateError) {
        console.error('Error advancing turn:', updateError);
        throw updateError;
      }
      
      console.log('✅ Turn advanced from', currentTurnIndex, 'to', nextTurnIndex);
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

  // Function to remove user from draft entirely
  const removeUserFromDraft = async (userId: string) => {
    try {
      // Remove user from member_ids array
      const updatedMemberIds = league.member_ids.filter(id => id !== userId);
      
      // Regenerate marketplace order without the user
      const newMarketplaceOrder = generateSnakeDraftOrder(updatedMemberIds, 10);
      
      // Update the league to remove the user and regenerate the marketplace order
      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          member_ids: updatedMemberIds,
          marketplace_order: newMarketplaceOrder,
          current_marketplace_turn: 0 // Reset to beginning since order changed
        })
        .eq('id', league.id);
      
      if (updateError) {
        console.error('Error removing user from draft:', updateError);
        throw updateError;
      }

      console.log('✅ User removed from draft entirely');
      
      // Check if marketplace should end after user removal
      const { data: updatedLeague } = await supabase
        .from('leagues')
        .select('marketplace_completed, member_ids')
        .eq('id', league.id)
        .single();
      
      const remainingMembers = updatedLeague?.member_ids || [];
      
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
            // Only human player remains, end marketplace
            console.log('🏁 Marketplace ending - only human player remains');
            await supabase
              .from('leagues')
              .update({ marketplace_completed: true })
              .eq('id', league.id);
          }
        } else {
          // No members left, end marketplace
          console.log('🏁 Marketplace ending - no participants');
          await supabase
            .from('leagues')
            .update({ marketplace_completed: true })
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

  // Function to remove bot from draft entirely
  const removeBotFromDraft = async (botId: string) => {
    try {
      // Remove bot from member_ids array
      const updatedMemberIds = league.member_ids.filter(id => id !== botId);
      
      // Regenerate marketplace order without the bot
      const newMarketplaceOrder = generateSnakeDraftOrder(updatedMemberIds, 10);
      
      // Update the league to remove the bot and regenerate the marketplace order
      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          member_ids: updatedMemberIds,
          marketplace_order: newMarketplaceOrder,
          current_marketplace_turn: 0 // Reset to beginning since order changed
        })
        .eq('id', league.id);
      
      if (updateError) {
        console.error('Error removing bot from draft:', updateError);
        throw updateError;
      }

      console.log('✅ Bot removed from draft entirely');
      
      // Check if marketplace should end after bot removal
      const { data: updatedLeague } = await supabase
        .from('leagues')
        .select('marketplace_completed, member_ids')
        .eq('id', league.id)
        .single();
      
      const remainingMembers = updatedLeague?.member_ids || [];
      
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
            // Only human player remains, end marketplace
            console.log('🏁 Marketplace ending - only human player remains');
            await supabase
              .from('leagues')
              .update({ marketplace_completed: true })
              .eq('id', league.id);
          }
        } else {
          // No members left, end marketplace
          console.log('🏁 Marketplace ending - no participants');
          await supabase
            .from('leagues')
            .update({ marketplace_completed: true })
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
          marketplace_completed: true
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

  // Function to show marketplace completion popup
  const showMarketplaceCompletionPopup = async () => {
    try {
      // Get bot's team and choices
      const { data: botTeam } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('league_id', league.id)
        .eq('user_id', league.bot_id)
        .single();

      const botPlayerIds = botTeam?.player_ids || [];
      
      // Get bot's player names
      const { data: botPlayers } = await supabase
        .from('chess_players')
        .select('name, elo')
        .in('id', botPlayerIds);

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
  }, [availablePlayers, searchTerm, userCoinBalance]);

  if (!league.marketplace_started) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-200">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Turn-Based Marketplace</h3>
        <p className="text-gray-600 mb-4">
          The marketplace allows players to take turns buying chess players. Each player can have up to {league.max_players_per_team || 10} players on their team.
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
            Waiting for the league owner to start the marketplace...
          </div>
        )}
      </div>
    );
  }

  if (league.marketplace_completed || league.draft_completed || (league.marketplace_order && league.marketplace_order.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          {league.marketplace_completed ? 'Marketplace Complete!' : 'Draft Complete!'}
        </h3>
        <p className="text-gray-600 mb-4">
          {league.marketplace_completed 
            ? 'The marketplace phase is complete! All players have used their coins to build their teams. You can now set your weekly lineups for the season.'
            : 'All players have completed their turns. The draft is now finished, but the marketplace remains open for trading.'
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
          </div>
            )}
            {/* Bot turn indicator */}
            {currentTurn && !isUserTurn && (
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
        </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Loading turn information...</p>
                  </div>
                )}

        {/* Auto-remove info */}
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
          <p className="text-orange-700 font-semibold">💡 Auto-Remove Feature</p>
          <p className="text-orange-600">Users with 0 coins are automatically removed from the draft entirely</p>
          </div>
        </div>


      {/* User's Turn Actions */}

      {/* Error Message */}
      {(error || dataError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error || dataError}
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
                  onBuyClick={(player) => {
                          setSelectedPlayer(player);
                          setShowBuyConfirmation(true);
                        }}
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

      {/* Marketplace Open/Closed Message */}
      {!marketplaceDraftCompleted && !isMarketplaceOpen() && (
        <div className="text-red-600 font-semibold mb-2">
          The marketplace is closed. It opens Wednesday 1 AM PT and closes Monday 11:59 PM PT.
        </div>
      )}

      {/* Hide buy/skip/end UI if user has no coins or draft is completed */}
      {(userCoinBalance === 0 || userCoinBalance === null || marketplaceDraftCompleted) && isUserTurn && (
        <div className="text-gray-500 italic">You have no coins remaining or the draft is completed.</div>
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
    </div>
  );
} 