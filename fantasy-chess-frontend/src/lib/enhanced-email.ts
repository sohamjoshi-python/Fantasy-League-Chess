import { supabase } from './supabase';
import { emailTemplates } from './email-templates';

// Enhanced email system with better functionality

export interface EmailData {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  userId?: string;
  leagueId?: string;
  metadata?: Record<string, any>;
}

export interface EmailSchedule {
  id: string;
  userId: string;
  templateId: string;
  scheduledFor: Date;
  data: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

// Enhanced email sending with tracking and analytics
export async function sendEnhancedEmail(emailData: EmailData): Promise<{ success: boolean, emailId?: string, error?: any }> {
  try {
    // Get access token for Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No access token available');
    }

    // Send email via enhanced edge function
    const response = await fetch('https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/send-enhanced-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        textContent: emailData.textContent || stripHtml(emailData.htmlContent),
        templateId: emailData.templateId,
        userId: emailData.userId,
        leagueId: emailData.leagueId,
        metadata: emailData.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email sending failed: ${error}`);
    }

    const result = await response.json();
    return { success: true, emailId: result.emailId };
  } catch (error: any) {
    console.error('Error sending enhanced email:', error);
    return { success: false, error: error.message };
  }
}

// Schedule emails for later delivery
export async function scheduleEmail(
  userId: string,
  templateId: string,
  scheduledFor: Date,
  data: Record<string, any>
): Promise<{ success: boolean, scheduleId?: string, error?: any }> {
  try {
    const { data: result, error } = await supabase
      .from('email_schedules')
      .insert({
        user_id: userId,
        template_id: templateId,
        scheduled_for: scheduledFor.toISOString(),
        data: data,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, scheduleId: result.id };
  } catch (error: any) {
    console.error('Error scheduling email:', error);
    return { success: false, error: error.message };
  }
}

// Send scheduled emails (called by cron job)
export async function processScheduledEmails(): Promise<{ success: boolean, processed: number, error?: any }> {
  try {
    // Get pending emails that are due
    const { data: scheduledEmails, error } = await supabase
      .from('email_schedules')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (error) throw error;

    let processed = 0;
    for (const scheduledEmail of scheduledEmails || []) {
      try {
        // Get user email
        const { data: user } = await supabase
          .from('users')
          .select('email')
          .eq('id', scheduledEmail.user_id)
          .single();

        if (!user?.email) continue;

        // Generate email content using template
        const template = emailTemplates[scheduledEmail.template_id as keyof typeof emailTemplates];
        if (!template) continue;

        const htmlContent = template({
          userName: scheduledEmail.data.userName || 'Player',
          leagueName: scheduledEmail.data.leagueName || 'League',
          ...scheduledEmail.data
        });

        // Send the email
        const emailResult = await sendEnhancedEmail({
          to: user.email,
          subject: scheduledEmail.data.subject || 'Fantasy League Chess Update',
          htmlContent,
          templateId: scheduledEmail.template_id,
          userId: scheduledEmail.user_id,
          leagueId: scheduledEmail.data.leagueId,
          metadata: scheduledEmail.data
        });

        // Update schedule status
        await supabase
          .from('email_schedules')
          .update({ 
            status: emailResult.success ? 'sent' : 'failed',
            sent_at: emailResult.success ? new Date().toISOString() : null,
            error_message: emailResult.success ? null : emailResult.error
          })
          .eq('id', scheduledEmail.id);

        if (emailResult.success) processed++;
      } catch (emailError) {
        console.error('Error processing scheduled email:', emailError);
        // Mark as failed
        await supabase
          .from('email_schedules')
          .update({ 
            status: 'failed',
            error_message: emailError instanceof Error ? emailError.message : 'Unknown error'
          })
          .eq('id', scheduledEmail.id);
      }
    }

    return { success: true, processed };
  } catch (error: any) {
    console.error('Error processing scheduled emails:', error);
    return { success: false, processed: 0, error: error.message };
  }
}

// Email automation functions
export const emailAutomation = {
  // Send weekly results to all league members
  async sendWeeklyResults(leagueId: string, week: string): Promise<void> {
    try {
      // Get league standings
      const { data: standings } = await supabase.rpc('get_league_standings', { league_id: leagueId });
      if (!standings) return;

      // Get league info
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids')
        .eq('id', leagueId)
        .single();

      if (!league) return;

      // Send to each member
      for (const member of standings) {
        const { data: user } = await supabase
          .from('users')
          .select('email, display_name')
          .eq('id', member.user_id)
          .single();

        if (!user?.email) continue;

        const htmlContent = emailTemplates.weeklyResults({
          userName: user.display_name || 'Player',
          leagueName: league.name,
          leagueId,
          week,
          rank: member.rank,
          points: member.total_points,
          totalPlayers: standings.length,
          topPerformers: standings.slice(0, 3).map((s: any) => ({
            name: s.display_name || 'Player',
            points: s.total_points,
            wins: s.wins || 0
          })),
          leagueStandings: standings.map((s: any) => ({
            rank: s.rank,
            name: s.display_name || 'Player',
            points: s.total_points
          }))
        });

        await sendEnhancedEmail({
          to: user.email,
          subject: `Week ${week} Results - ${league.name}`,
          htmlContent,
          templateId: 'weeklyResults',
          userId: member.user_id,
          leagueId,
          metadata: { week, rank: member.rank, points: member.total_points }
        });
      }
    } catch (error) {
      console.error('Error sending weekly results:', error);
    }
  },

  // Send league start notifications
  async sendLeagueStartNotifications(leagueId: string): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids, start_date, end_date, buy_in')
        .eq('id', leagueId)
        .single();

      if (!league) return;

      for (const userId of league.member_ids) {
        const { data: user } = await supabase
          .from('users')
          .select('email, display_name')
          .eq('id', userId)
          .single();

        if (!user?.email) continue;

        const htmlContent = emailTemplates.leagueStart({
          userName: user.display_name || 'Player',
          leagueName: league.name,
          leagueId,
          startDate: new Date(league.start_date).toLocaleDateString(),
          endDate: new Date(league.end_date).toLocaleDateString(),
          memberCount: league.member_ids.length,
          buyIn: league.buy_in
        });

        await sendEnhancedEmail({
          to: user.email,
          subject: `League Starting - ${league.name}`,
          htmlContent,
          templateId: 'leagueStart',
          userId,
          leagueId
        });
      }
    } catch (error) {
      console.error('Error sending league start notifications:', error);
    }
  },

  // Send draft reminders
  async sendDraftReminders(leagueId: string, draftTime: Date): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids')
        .eq('id', leagueId)
        .single();

      if (!league) return;

      // Schedule draft reminders 1 hour before
      const reminderTime = new Date(draftTime.getTime() - 60 * 60 * 1000);

      for (let i = 0; i < league.member_ids.length; i++) {
        const userId = league.member_ids[i];
        
        await scheduleEmail(
          userId,
          'draftReminder',
          reminderTime,
          {
            userName: 'Player', // Will be filled when email is sent
            leagueName: league.name,
            leagueId,
            draftTime: draftTime.toLocaleString(),
            draftOrder: i + 1,
            totalPlayers: league.member_ids.length,
            estimatedDuration: `${Math.ceil(league.member_ids.length * 2)} minutes`,
            subject: `Draft Starting Soon - ${league.name}`
          }
        );
      }
    } catch (error) {
      console.error('Error scheduling draft reminders:', error);
    }
  },

  // Send coin distribution notifications
  async sendCoinDistributionNotifications(userId: string, coinsReceived: number, distributionType: string, leagueName?: string): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name, coin_balance')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      const htmlContent = emailTemplates.coinDistribution({
        userName: user.display_name || 'Player',
        leagueName: leagueName || 'Fantasy League Chess',
        coinsReceived,
        newBalance: user.coin_balance,
        distributionType: distributionType as 'weekly' | 'standings_bonus' | 'league_win'
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Coins Received - +${coinsReceived} coins`,
        htmlContent,
        templateId: 'coinDistribution',
        userId,
        metadata: { coinsReceived, distributionType, leagueName }
      });
    } catch (error) {
      console.error('Error sending coin distribution notification:', error);
    }
  },

  // Send marketplace alerts
  async sendMarketplaceAlert(userId: string, leagueId: string, playerData: any): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      const { data: league } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single();

      const htmlContent = emailTemplates.marketplaceAlert({
        userName: user.display_name || 'Player',
        leagueName: league?.name || 'League',
        leagueId,
        playerName: playerData.name,
        playerElo: playerData.elo,
        price: playerData.price,
        sellerName: playerData.sellerName,
        timeRemaining: playerData.timeRemaining
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `New Player Available - ${playerData.name}`,
        htmlContent,
        templateId: 'marketplaceAlert',
        userId,
        leagueId,
        metadata: { playerData }
      });
    } catch (error) {
      console.error('Error sending marketplace alert:', error);
    }
  },

  // Send lineup reminders
  async sendLineupReminders(leagueId: string, deadline: Date): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids')
        .eq('id', leagueId)
        .single();

      if (!league) return;

      // Schedule reminders 24 hours before deadline
      const reminderTime = new Date(deadline.getTime() - 24 * 60 * 60 * 1000);

      for (const userId of league.member_ids) {
        await scheduleEmail(
          userId,
          'lineupReminder',
          reminderTime,
          {
            userName: 'Player', // Will be filled when email is sent
            leagueName: league.name,
            leagueId,
            deadline: deadline.toLocaleString(),
            subject: `Lineup Reminder - ${league.name}`
          }
        );
      }
    } catch (error) {
      console.error('Error scheduling lineup reminders:', error);
    }
  }
};

// Utility function to strip HTML for text fallback
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Email analytics and tracking
export const emailAnalytics = {
  // Track email opens
  async trackEmailOpen(emailId: string, userId?: string): Promise<void> {
    try {
      await supabase
        .from('email_events')
        .insert({
          email_id: emailId,
          user_id: userId,
          event_type: 'open',
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking email open:', error);
    }
  },

  // Track email clicks
  async trackEmailClick(emailId: string, userId?: string, linkUrl?: string): Promise<void> {
    try {
      await supabase
        .from('email_events')
        .insert({
          email_id: emailId,
          user_id: userId,
          event_type: 'click',
          metadata: { linkUrl },
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking email click:', error);
    }
  },

  // Get email statistics
  async getEmailStats(userId: string, days: number = 30): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('email_events')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        opens: data?.filter(e => e.event_type === 'open').length || 0,
        clicks: data?.filter(e => e.event_type === 'click').length || 0,
        openRate: 0,
        clickRate: 0
      };

      if (stats.total > 0) {
        stats.openRate = (stats.opens / stats.total) * 100;
        stats.clickRate = (stats.clicks / stats.total) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Error getting email stats:', error);
      return null;
    }
  }
}; 