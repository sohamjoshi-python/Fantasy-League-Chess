import { supabase } from './supabase';
import { emailTemplates } from './email-templates';
import { sendEnhancedEmail, scheduleEmail } from './enhanced-email';

// Expanded Email Automation System
// This adds MANY more email triggers to increase user engagement

export const expandedEmailAutomation = {
  // ===== LEAGUE LIFE CYCLE EMAILS =====
  
  // 1. League Creation & Joining
  async sendLeagueCreatedEmail(leagueId: string, creatorId: string): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, buy_in, start_date, end_date')
        .eq('id', leagueId)
        .single();

      const { data: creator } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', creatorId)
        .single();

      if (!league || !creator?.email) return;

      const htmlContent = emailTemplates.leagueCreated({
        userName: creator.display_name || 'Player',
        leagueName: league.name,
        leagueId,
        buyIn: league.buy_in,
        startDate: new Date(league.start_date).toLocaleDateString(),
        endDate: new Date(league.end_date).toLocaleDateString()
      });

      await sendEnhancedEmail({
        to: creator.email,
        subject: `League Created: ${league.name}`,
        htmlContent,
        templateId: 'leagueCreated',
        userId: creatorId,
        leagueId
      });
    } catch (error) {
      console.error('Error sending league created email:', error);
    }
  },

  async sendLeagueJoinedEmail(userId: string, leagueId: string): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids, buy_in')
        .eq('id', leagueId)
        .single();

      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!league || !user?.email) return;

      const htmlContent = emailTemplates.leagueJoined({
        userName: user.display_name || 'Player',
        leagueName: league.name,
        leagueId,
        memberCount: league.member_ids.length,
        buyIn: league.buy_in
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Welcome to ${league.name}!`,
        htmlContent,
        templateId: 'leagueJoined',
        userId,
        leagueId
      });
    } catch (error) {
      console.error('Error sending league joined email:', error);
    }
  },

  // 2. Pre-League Preparation
  async sendLeagueStartingSoonEmail(leagueId: string, daysUntilStart: number): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids, start_date')
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

        const htmlContent = emailTemplates.leagueStartingSoon({
          userName: user.display_name || 'Player',
          leagueName: league.name,
          leagueId,
          daysUntilStart,
          startDate: new Date(league.start_date).toLocaleDateString()
        });

        await sendEnhancedEmail({
          to: user.email,
          subject: `${league.name} starts in ${daysUntilStart} days!`,
          htmlContent,
          templateId: 'leagueStartingSoon',
          userId,
          leagueId
        });
      }
    } catch (error) {
      console.error('Error sending league starting soon email:', error);
    }
  },

  // 3. Draft Process
  async sendDraftStartingSoonEmail(leagueId: string, hoursUntilDraft: number): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids, marketplace_start_time')
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

        const htmlContent = emailTemplates.draftStartingSoon({
          userName: user.display_name || 'Player',
          leagueName: league.name,
          leagueId,
          hoursUntilDraft,
          draftTime: new Date(league.marketplace_start_time).toLocaleString()
        });

        await sendEnhancedEmail({
          to: user.email,
          subject: `Draft for ${league.name} starts in ${hoursUntilDraft} hours!`,
          htmlContent,
          templateId: 'draftStartingSoon',
          userId,
          leagueId
        });
      }
    } catch (error) {
      console.error('Error sending draft starting soon email:', error);
    }
  },

  async sendDraftTurnReminderEmail(userId: string, leagueId: string, playerName: string): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single();

      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!league || !user?.email) return;

      const htmlContent = emailTemplates.draftTurnReminder({
        userName: user.display_name || 'Player',
        leagueName: league.name,
        leagueId,
        playerName
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Your turn to draft in ${league.name}!`,
        htmlContent,
        templateId: 'draftTurnReminder',
        userId,
        leagueId
      });
    } catch (error) {
      console.error('Error sending draft turn reminder email:', error);
    }
  },

  // 4. Weekly Competition
  async sendTitledTuesdayReminderEmail(leagueId: string, hoursUntilEvent: number): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids')
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

        const htmlContent = emailTemplates.titledTuesdayReminder({
          userName: user.display_name || 'Player',
          leagueName: league.name,
          leagueId,
          hoursUntilEvent
        });

        await sendEnhancedEmail({
          to: user.email,
          subject: `Titled Tuesday starts in ${hoursUntilEvent} hours!`,
          htmlContent,
          templateId: 'titledTuesdayReminder',
          userId,
          leagueId
        });
      }
    } catch (error) {
      console.error('Error sending Titled Tuesday reminder email:', error);
    }
  },

  async sendLineupDeadlineReminderEmail(userId: string, leagueId: string, hoursUntilDeadline: number): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single();

      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!league || !user?.email) return;

      const htmlContent = emailTemplates.lineupDeadlineReminder({
        userName: user.display_name || 'Player',
        leagueName: league.name,
        leagueId,
        hoursUntilDeadline
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Lineup deadline in ${hoursUntilDeadline} hours!`,
        htmlContent,
        templateId: 'lineupDeadlineReminder',
        userId,
        leagueId
      });
    } catch (error) {
      console.error('Error sending lineup deadline reminder email:', error);
    }
  },

  // 5. Marketplace Activity
  async sendPlayerListedEmail(leagueId: string, playerData: any, sellerId: string): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids')
        .eq('id', leagueId)
        .single();

      if (!league) return;

      // Send to all league members except seller
      for (const userId of league.member_ids) {
        if (userId === sellerId) continue;

        const { data: user } = await supabase
          .from('users')
          .select('email, display_name')
          .eq('id', userId)
          .single();

        if (!user?.email) continue;

        const { data: seller } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', sellerId)
          .single();

        const htmlContent = emailTemplates.playerListed({
          userName: user.display_name || 'Player',
          leagueName: league.name,
          leagueId,
          playerName: playerData.name,
          playerElo: playerData.elo,
          price: playerData.price,
          sellerName: seller?.display_name || 'Player'
        });

        await sendEnhancedEmail({
          to: user.email,
          subject: `New player listed: ${playerData.name}`,
          htmlContent,
          templateId: 'playerListed',
          userId,
          leagueId
        });
      }
    } catch (error) {
      console.error('Error sending player listed email:', error);
    }
  },

  async sendPlayerSoldEmail(buyerId: string, sellerId: string, leagueId: string, playerData: any): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single();

      const { data: buyer } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', buyerId)
        .single();

      const { data: seller } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', sellerId)
        .single();

      if (!league) return;

      // Send to buyer
      if (buyer?.email) {
        const buyerHtml = emailTemplates.playerPurchased({
          userName: buyer.display_name || 'Player',
          leagueName: league.name,
          leagueId,
          playerName: playerData.name,
          playerElo: playerData.elo,
          price: playerData.price,
          sellerName: seller?.display_name || 'Player'
        });

        await sendEnhancedEmail({
          to: buyer.email,
          subject: `Player purchased: ${playerData.name}`,
          htmlContent: buyerHtml,
          templateId: 'playerPurchased',
          userId: buyerId,
          leagueId
        });
      }

      // Send to seller
      if (seller?.email) {
        const sellerHtml = emailTemplates.playerSold({
          userName: seller.display_name || 'Player',
          leagueName: league.name,
          leagueId,
          playerName: playerData.name,
          playerElo: playerData.elo,
          price: playerData.price,
          buyerName: buyer?.display_name || 'Player'
        });

        await sendEnhancedEmail({
          to: seller.email,
          subject: `Player sold: ${playerData.name}`,
          htmlContent: sellerHtml,
          templateId: 'playerSold',
          userId: sellerId,
          leagueId
        });
      }
    } catch (error) {
      console.error('Error sending player sold email:', error);
    }
  },

  // 6. Performance & Achievement
  async sendWeeklyPerformanceEmail(userId: string, leagueId: string, week: string, performance: any): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single();

      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!league || !user?.email) return;

      const htmlContent = emailTemplates.weeklyPerformance({
        userName: user.display_name || 'Player',
        leagueName: league.name,
        leagueId,
        week,
        rank: performance.rank,
        points: performance.points,
        totalPlayers: performance.totalPlayers,
        bestPlayer: performance.bestPlayer,
        worstPlayer: performance.worstPlayer,
        improvement: performance.improvement
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Week ${week} Performance - ${league.name}`,
        htmlContent,
        templateId: 'weeklyPerformance',
        userId,
        leagueId
      });
    } catch (error) {
      console.error('Error sending weekly performance email:', error);
    }
  },

  async sendAchievementUnlockedEmail(userId: string, achievement: any): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      const htmlContent = emailTemplates.achievementUnlocked({
        userName: user.display_name || 'Player',
        leagueName: 'Pawn Royale', // Default league name for achievements
        leagueId: 'general',
        achievementName: achievement.name,
        achievementDescription: achievement.description,
        achievementIcon: achievement.icon,
        pointsEarned: achievement.points
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Achievement Unlocked: ${achievement.name}!`,
        htmlContent,
        templateId: 'achievementUnlocked',
        userId
      });
    } catch (error) {
      console.error('Error sending achievement unlocked email:', error);
    }
  },

  // 7. Social & Competition
  async sendRivalryAlertEmail(userId: string, rivalId: string, leagueId: string, rivalryData: any): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single();

      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      const { data: rival } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', rivalId)
        .single();

      if (!league || !user?.email || !rival) return;

      const htmlContent = emailTemplates.rivalryAlert({
        userName: user.display_name || 'Player',
        rivalName: rival.display_name || 'Player',
        leagueName: league.name,
        leagueId,
        rivalryType: rivalryData.type,
        rivalryStats: rivalryData.stats
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Rivalry Alert: ${rival.display_name} in ${league.name}`,
        htmlContent,
        templateId: 'rivalryAlert',
        userId,
        leagueId
      });
    } catch (error) {
      console.error('Error sending rivalry alert email:', error);
    }
  },

  async sendLeagueStandingsUpdateEmail(leagueId: string, standingsChange: any): Promise<void> {
    try {
      const { data: league } = await supabase
        .from('leagues')
        .select('name, member_ids')
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

        const userChange = standingsChange.changes.find((c: any) => c.userId === userId);
        if (!userChange) continue;

        const htmlContent = emailTemplates.standingsUpdate({
          userName: user.display_name || 'Player',
          leagueName: league.name,
          leagueId,
          oldRank: userChange.oldRank,
          newRank: userChange.newRank,
          rankChange: userChange.rankChange,
          pointsChange: userChange.pointsChange
        });

        await sendEnhancedEmail({
          to: user.email,
          subject: `Standings Update - ${league.name}`,
          htmlContent,
          templateId: 'standingsUpdate',
          userId,
          leagueId
        });
      }
    } catch (error) {
      console.error('Error sending standings update email:', error);
    }
  },

  // 8. Engagement & Retention
  async sendInactivityReminderEmail(userId: string, daysInactive: number): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      const htmlContent = emailTemplates.inactivityReminder({
        userName: user.display_name || 'Player',
        leagueName: 'Pawn Royale',
        leagueId: 'general',
        daysInactive
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `We miss you! Come back to Pawn Royale`,
        htmlContent,
        templateId: 'inactivityReminder',
        userId
      });
    } catch (error) {
      console.error('Error sending inactivity reminder email:', error);
    }
  },

  async sendWeeklyDigestEmail(userId: string, digestData: any): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      const htmlContent = emailTemplates.weeklyDigest({
        userName: user.display_name || 'Player',
        leagueName: 'Pawn Royale',
        leagueId: 'general',
        week: digestData.week,
        summary: digestData.summary,
        topPerformers: digestData.topPerformers,
        upcomingEvents: digestData.upcomingEvents
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Your Weekly Pawn Royale Digest - Week ${digestData.week}`,
        htmlContent,
        templateId: 'weeklyDigest',
        userId
      });
    } catch (error) {
      console.error('Error sending weekly digest email:', error);
    }
  },

  // 9. Special Events & Promotions
  async sendSpecialEventEmail(userId: string, eventData: any): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      const htmlContent = emailTemplates.specialEvent({
        userName: user.display_name || 'Player',
        leagueName: 'Pawn Royale',
        leagueId: 'general',
        eventName: eventData.name,
        eventDescription: eventData.description,
        eventDate: eventData.date,
        eventRewards: eventData.rewards
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Special Event: ${eventData.name}`,
        htmlContent,
        templateId: 'specialEvent',
        userId
      });
    } catch (error) {
      console.error('Error sending special event email:', error);
    }
  },

  async sendPromotionEmail(userId: string, promotionData: any): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      const htmlContent = emailTemplates.promotion({
        userName: user.display_name || 'Player',
        leagueName: 'Pawn Royale',
        leagueId: 'general',
        promotionTitle: promotionData.title,
        promotionDescription: promotionData.description,
        promotionCode: promotionData.code,
        validUntil: promotionData.validUntil
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Special Promotion: ${promotionData.title}`,
        htmlContent,
        templateId: 'promotion',
        userId
      });
    } catch (error) {
      console.error('Error sending promotion email:', error);
    }
  },

  // 10. System & Maintenance
  async sendMaintenanceNotificationEmail(userId: string, maintenanceData: any): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      const htmlContent = emailTemplates.maintenanceNotification({
        userName: user.display_name || 'Player',
        leagueName: 'Pawn Royale',
        leagueId: 'general',
        maintenanceDate: maintenanceData.date,
        duration: maintenanceData.duration,
        reason: maintenanceData.reason
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `Scheduled Maintenance - ${maintenanceData.date}`,
        htmlContent,
        templateId: 'maintenanceNotification',
        userId
      });
    } catch (error) {
      console.error('Error sending maintenance notification email:', error);
    }
  },

  async sendFeatureUpdateEmail(userId: string, featureData: any): Promise<void> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      const htmlContent = emailTemplates.featureUpdate({
        userName: user.display_name || 'Player',
        leagueName: 'Pawn Royale',
        leagueId: 'general',
        featureName: featureData.name,
        featureDescription: featureData.description,
        newCapabilities: featureData.capabilities
      });

      await sendEnhancedEmail({
        to: user.email,
        subject: `New Feature: ${featureData.name}`,
        htmlContent,
        templateId: 'featureUpdate',
        userId
      });
    } catch (error) {
      console.error('Error sending feature update email:', error);
    }
  }
};

// Scheduled Email Triggers
export const scheduledEmailTriggers = {
  // Schedule league starting soon emails (3 days before)
  async scheduleLeagueStartingSoonEmails(): Promise<void> {
    try {
      const { data: leagues } = await supabase
        .from('leagues')
        .select('id, name, start_date, member_ids')
        .gte('start_date', new Date().toISOString())
        .lt('start_date', new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString());

      for (const league of leagues || []) {
        const daysUntilStart = Math.ceil((new Date(league.start_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        
        if (daysUntilStart === 3) {
          for (const userId of league.member_ids) {
            await scheduleEmail(
              userId,
              'leagueStartingSoon',
              new Date(Date.now() + 24 * 60 * 60 * 1000), // Send tomorrow
              {
                leagueName: league.name,
                leagueId: league.id,
                daysUntilStart: 3,
                startDate: new Date(league.start_date).toLocaleDateString()
              }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling league starting soon emails:', error);
    }
  },

  // Schedule draft reminders (1 hour before)
  async scheduleDraftReminders(): Promise<void> {
    try {
      const { data: leagues } = await supabase
        .from('leagues')
        .select('id, name, marketplace_start_time, member_ids')
        .eq('marketplace_started', false)
        .not('marketplace_start_time', 'is', null);

      for (const league of leagues || []) {
        const hoursUntilDraft = Math.ceil((new Date(league.marketplace_start_time).getTime() - Date.now()) / (60 * 60 * 1000));
        
        if (hoursUntilDraft === 1) {
          for (const userId of league.member_ids) {
            await scheduleEmail(
              userId,
              'draftStartingSoon',
              new Date(Date.now() + 30 * 60 * 1000), // Send in 30 minutes
              {
                leagueName: league.name,
                leagueId: league.id,
                hoursUntilDraft: 1,
                draftTime: new Date(league.marketplace_start_time).toLocaleString()
              }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling draft reminders:', error);
    }
  },

  // Schedule Titled Tuesday reminders (2 hours before)
  async scheduleTitledTuesdayReminders(): Promise<void> {
    try {
      // Calculate next Tuesday at 8 PM UTC
      const now = new Date();
      const daysUntilTuesday = (2 - now.getDay() + 7) % 7;
      const nextTuesday = new Date(now);
      nextTuesday.setDate(now.getDate() + daysUntilTuesday);
      nextTuesday.setHours(20, 0, 0, 0); // 8 PM UTC

      const { data: activeLeagues } = await supabase
        .from('leagues')
        .select('id, name, member_ids')
        .lte('start_date', now.toISOString())
        .gte('end_date', now.toISOString());

      for (const league of activeLeagues || []) {
        for (const userId of league.member_ids) {
          await scheduleEmail(
            userId,
            'titledTuesdayReminder',
            new Date(nextTuesday.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
            {
              leagueName: league.name,
              leagueId: league.id,
              hoursUntilEvent: 2
            }
          );
        }
      }
    } catch (error) {
      console.error('Error scheduling Titled Tuesday reminders:', error);
    }
  },

  // Schedule weekly digest emails (every Sunday)
  async scheduleWeeklyDigestEmails(): Promise<void> {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, display_name')
        .not('email', 'is', null);

      for (const user of users || []) {
        await scheduleEmail(
          user.id,
          'weeklyDigest',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next Sunday
          {
            userName: user.display_name || 'Player'
          }
        );
      }
    } catch (error) {
      console.error('Error scheduling weekly digest emails:', error);
    }
  },

  // Schedule inactivity reminders (after 7 days of inactivity)
  async scheduleInactivityReminders(): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const { data: inactiveUsers } = await supabase
        .from('users')
        .select('id, email, display_name, last_login')
        .lt('last_login', sevenDaysAgo.toISOString())
        .not('email', 'is', null);

      for (const user of inactiveUsers || []) {
        const daysInactive = Math.floor((Date.now() - new Date(user.last_login).getTime()) / (24 * 60 * 60 * 1000));
        
        await scheduleEmail(
          user.id,
          'inactivityReminder',
          new Date(Date.now() + 24 * 60 * 60 * 1000), // Send tomorrow
          {
            userName: user.display_name || 'Player',
            daysInactive
          }
        );
      }
    } catch (error) {
      console.error('Error scheduling inactivity reminders:', error);
    }
  }
}; 