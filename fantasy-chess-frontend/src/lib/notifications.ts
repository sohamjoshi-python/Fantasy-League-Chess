import { supabase } from './supabase';

export interface NotificationData {
  title: string;
  message: string;
  type: 'league_start' | 'weekly_results' | 'league_end' | 'draft_start' | 'payout_processed' | 'player_removed' | 'league_joined';
  data?: any;
}

/**
 * Send a notification to a specific user
 */
export async function sendNotification(
  userId: string, 
  leagueId: string, 
  notification: NotificationData
): Promise<{ success: boolean, error?: any }> {
  try {
    const { error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_league_id: leagueId,
      p_title: notification.title,
      p_message: notification.message,
      p_type: notification.type,
      p_data: notification.data || null
    });

    if (error) {
      console.error('Error sending notification:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in sendNotification:', error);
    return { success: false, error };
  }
}

/**
 * Send notifications to all members of a league
 */
export async function sendNotificationToLeague(
  leagueId: string,
  notification: NotificationData,
  excludeUserId?: string
): Promise<{ success: boolean, error?: any }> {
  try {
    // Get league members
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('member_ids')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return { success: false, error: leagueError || 'League not found' };
    }

    // Send notification to each member (except excluded user)
    const memberIds = excludeUserId 
      ? league.member_ids.filter((id: string) => id !== excludeUserId)
      : league.member_ids;

    const promises = memberIds.map((userId: string) => 
      sendNotification(userId, leagueId, notification)
    );

    await Promise.all(promises);
    return { success: true };
  } catch (error: any) {
    console.error('Error in sendNotificationToLeague:', error);
    return { success: false, error };
  }
}

/**
 * Notification templates for common events
 */
export const notificationTemplates = {
  leagueStart: (leagueName: string): NotificationData => ({
    title: 'League Starting!',
    message: `Your league "${leagueName}" is starting today. Good luck!`,
    type: 'league_start'
  }),

  draftStart: (leagueName: string): NotificationData => ({
    title: 'Draft Starting!',
    message: `The draft for "${leagueName}" is starting now. Time to build your team!`,
    type: 'draft_start'
  }),

  weeklyResults: (leagueName: string, week: string, rank: number, points: number): NotificationData => ({
    title: 'Weekly Results Available',
    message: `Week ${week} results for "${leagueName}": You finished #${rank} with ${points} points.`,
    type: 'weekly_results',
    data: { week, rank, points }
  }),

  leagueEnd: (leagueName: string, finalRank: number, isWinner: boolean): NotificationData => ({
    title: isWinner ? '🏆 You Won!' : 'League Ended',
    message: isWinner 
      ? `Congratulations! You won "${leagueName}"!`
      : `"${leagueName}" has ended. You finished #${finalRank}.`,
    type: 'league_end',
    data: { finalRank, isWinner }
  }),

  payoutProcessed: (leagueName: string, amount: number): NotificationData => ({
    title: 'Payout Processed',
    message: `Your winnings of ${amount} coins from "${leagueName}" have been added to your account.`,
    type: 'payout_processed',
    data: { amount }
  }),

  playerRemoved: (leagueName: string, playerName: string): NotificationData => ({
    title: 'Player Removed',
    message: `${playerName} has been removed from "${leagueName}".`,
    type: 'player_removed',
    data: { playerName }
  }),

  leagueJoined: (leagueName: string): NotificationData => ({
    title: 'Welcome to the League!',
    message: `You've successfully joined "${leagueName}". The adventure begins!`,
    type: 'league_joined'
  })
}; 