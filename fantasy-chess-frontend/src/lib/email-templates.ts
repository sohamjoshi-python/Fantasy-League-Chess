// Email Templates for Pawn Royale
// Rich HTML emails with interactive elements and beautiful design

export interface EmailTemplateData {
  userName: string;
  leagueName: string;
  leagueId?: string;
  [key: string]: any;
}

// Base HTML template with Pawn Royale styling
const baseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
      line-height: 1.6; 
      color: #1f2937; 
      margin: 0; 
      padding: 0; 
      background-color: #f9fafb;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #4F7FFB 0%, #8B5CF6 100%); 
      color: white; 
      padding: 30px 20px; 
      text-align: center;
    }
    .logo { 
      width: 60px; 
      height: 60px; 
      background: white; 
      border-radius: 50%; 
      margin: 0 auto 15px; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      color: #4F7FFB;
    }
    .content { 
      padding: 30px 20px; 
    }
    .button { 
      display: inline-block; 
      background: #4F7FFB; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 600; 
      margin: 10px 5px;
    }
    .button:hover { 
      background: #3b5bdb; 
    }
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
      gap: 15px; 
      margin: 20px 0;
    }
    .stat-card { 
      background: #f8fafc; 
      padding: 15px; 
      border-radius: 8px; 
      text-align: center; 
      border: 1px solid #e2e8f0;
    }
    .stat-value { 
      font-size: 24px; 
      font-weight: bold; 
      color: #4F7FFB; 
    }
    .stat-label { 
      font-size: 12px; 
      color: #6b7280; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
    }
    .player-card { 
      background: white; 
      border: 1px solid #e5e7eb; 
      border-radius: 8px; 
      padding: 15px; 
      margin: 10px 0; 
      display: flex; 
      align-items: center;
    }
    .player-avatar { 
      width: 40px; 
      height: 40px; 
      background: #4F7FFB; 
      border-radius: 50%; 
      margin-right: 15px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      color: white; 
      font-weight: bold;
    }
    .player-info { 
      flex: 1;
    }
    .player-name { 
      font-weight: 600; 
      margin-bottom: 2px;
    }
    .player-stats { 
      font-size: 12px; 
      color: #6b7280;
    }
    .standings-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0;
    }
    .standings-table th, .standings-table td { 
      padding: 10px; 
      text-align: left; 
      border-bottom: 1px solid #e5e7eb;
    }
    .standings-table th { 
      background: #f8fafc; 
      font-weight: 600;
    }
    .footer { 
      background: #f8fafc; 
      padding: 20px; 
      text-align: center; 
      color: #6b7280; 
      font-size: 12px;
    }
    .highlight { 
      background: #fef3c7; 
      padding: 15px; 
      border-radius: 8px; 
      border-left: 4px solid #f59e0b;
      margin: 15px 0;
    }
    .success { 
      background: #d1fae5; 
      border-left-color: #10b981;
    }
    .warning { 
      background: #fef3c7; 
      border-left-color: #f59e0b;
    }
    .error { 
      background: #fee2e2; 
      border-left-color: #ef4444;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">♟️</div>
      <h1 style="margin: 0; font-size: 28px;">Pawn Royale</h1>
      <p style="margin: 10px 0 0; opacity: 0.9;">Fantasy Chess League</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© 2024 Pawn Royale. All rights reserved.</p>
      <p>
        <a href="https://pawn-royale.vercel.app/unsubscribe" style="color: #6b7280;">Unsubscribe</a> | 
        <a href="https://pawn-royale.vercel.app/privacy" style="color: #6b7280;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// 1. Weekly Results Email
export const weeklyResultsTemplate = (data: EmailTemplateData & {
  week: string;
  rank: number;
  points: number;
  totalPlayers: number;
  topPerformers: Array<{name: string, points: number, wins: number}>;
  leagueStandings: Array<{rank: number, name: string, points: number}>;
}) => {
  const content = `
    <h2>📊 Week ${data.week} Results Are In!</h2>
    <p>Hi ${data.userName},</p>
    <p>Your performance in <strong>${data.leagueName}</strong> has been calculated!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">#${data.rank}</div>
        <div class="stat-label">Your Rank</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.points}</div>
        <div class="stat-label">Points Earned</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.totalPlayers}</div>
        <div class="stat-label">Total Players</div>
      </div>
    </div>

    <div class="highlight ${data.rank <= 3 ? 'success' : data.rank <= data.totalPlayers / 2 ? 'warning' : 'error'}">
      <strong>${data.rank <= 3 ? '🏆 Excellent work!' : data.rank <= data.totalPlayers / 2 ? '💪 Keep pushing!' : '📈 Room to improve!'}</strong>
      ${data.rank <= 3 ? 'You\'re in the top 3!' : data.rank <= data.totalPlayers / 2 ? 'You\'re in the top half!' : 'Focus on your lineup strategy!'}
    </div>

    <h3>🏆 Top Performers This Week</h3>
    ${data.topPerformers.map(player => `
      <div class="player-card">
        <div class="player-avatar">${player.name.charAt(0)}</div>
        <div class="player-info">
          <div class="player-name">${player.name}</div>
          <div class="player-stats">${player.points} points • ${player.wins} wins</div>
        </div>
      </div>
    `).join('')}

    <h3>📈 League Standings</h3>
    <table class="standings-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        ${data.leagueStandings.map(standing => `
          <tr style="${standing.name === data.userName ? 'background: #fef3c7;' : ''}">
            <td>#${standing.rank}</td>
            <td>${standing.name}${standing.name === data.userName ? ' (You)' : ''}</td>
            <td>${standing.points}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View Full Results</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">Go to Dashboard</a>
    </div>
  `;
  
  return baseTemplate(content, `Week ${data.week} Results - ${data.leagueName}`);
};

// 2. League Start Email
export const leagueStartTemplate = (data: EmailTemplateData & {
  startDate: string;
  endDate: string;
  memberCount: number;
  buyIn: number;
}) => {
  const content = `
    <h2>🎉 Your League is Starting!</h2>
    <p>Hi ${data.userName},</p>
    <p><strong>${data.leagueName}</strong> is officially beginning today!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.memberCount}</div>
        <div class="stat-label">Players</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.buyIn}</div>
        <div class="stat-label">Buy-in (coins)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.startDate}</div>
        <div class="stat-label">Start Date</div>
      </div>
    </div>

    <div class="highlight success">
      <strong>🚀 Good luck!</strong> Your fantasy chess journey begins now. 
      Make sure to set your weekly lineups and check the marketplace for trading opportunities.
    </div>

    <h3>📅 Important Dates</h3>
    <ul>
      <li><strong>Start Date:</strong> ${data.startDate}</li>
      <li><strong>End Date:</strong> ${data.endDate}</li>
      <li><strong>Weekly Deadlines:</strong> Every Monday at 12:00 AM UTC</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View League</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">Set Lineup</a>
    </div>
  `;
  
  return baseTemplate(content, `League Starting - ${data.leagueName}`);
};

// 3. Draft Reminder Email
export const draftReminderTemplate = (data: EmailTemplateData & {
  draftTime: string;
  draftOrder: number;
  totalPlayers: number;
  estimatedDuration: string;
}) => {
  const content = `
    <h2>⚡ Draft Starting Soon!</h2>
    <p>Hi ${data.userName},</p>
    <p>The draft for <strong>${data.leagueName}</strong> is about to begin!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">#${data.draftOrder}</div>
        <div class="stat-label">Your Pick</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.totalPlayers}</div>
        <div class="stat-label">Total Players</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.estimatedDuration}</div>
        <div class="stat-label">Est. Duration</div>
      </div>
    </div>

    <div class="highlight warning">
      <strong>⏰ Don't miss your turn!</strong> The draft will start at ${data.draftTime}. 
      Make sure you're ready to pick your players when it's your turn.
    </div>

    <h3>🎯 Draft Strategy Tips</h3>
    <ul>
      <li>Research player ELO ratings and recent form</li>
      <li>Consider players who compete frequently in tournaments</li>
      <li>Balance high-rated players with consistent performers</li>
      <li>Don't forget about the snake draft format!</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">Join Draft</a>
      <a href="https://pawn-royale.vercel.app/help" class="button">Draft Guide</a>
    </div>
  `;
  
  return baseTemplate(content, `Draft Starting - ${data.leagueName}`);
};

// 4. League End Email
export const leagueEndTemplate = (data: EmailTemplateData & {
  finalRank: number;
  totalPoints: number;
  isWinner: boolean;
  prizeAmount: number;
  finalStandings: Array<{rank: number, name: string, points: number}>;
}) => {
  const content = `
    <h2>${data.isWinner ? '🏆 Congratulations! You Won!' : '🎯 League Complete!'}</h2>
    <p>Hi ${data.userName},</p>
    <p><strong>${data.leagueName}</strong> has officially ended!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">#${data.finalRank}</div>
        <div class="stat-label">Final Rank</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.totalPoints}</div>
        <div class="stat-label">Total Points</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.prizeAmount}</div>
        <div class="stat-label">Prize (coins)</div>
      </div>
    </div>

    <div class="highlight ${data.isWinner ? 'success' : 'warning'}">
      <strong>${data.isWinner ? '🎉 You are the champion!' : '💪 Great effort!'}</strong>
      ${data.isWinner 
        ? `You've won ${data.prizeAmount} coins! Your winnings have been added to your account.`
        : `You finished #${data.finalRank} with ${data.totalPoints} points. Keep improving for next time!`
      }
    </div>

    <h3>🏆 Final Standings</h3>
    <table class="standings-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        ${data.finalStandings.map(standing => `
          <tr style="${standing.name === data.userName ? 'background: #fef3c7;' : ''}">
            <td>#${standing.rank}</td>
            <td>${standing.name}${standing.name === data.userName ? ' (You)' : ''}</td>
            <td>${standing.points}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/join-league" class="button">Join New League</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">View Profile</a>
    </div>
  `;
  
  return baseTemplate(content, `${data.isWinner ? 'Victory!' : 'League Complete'} - ${data.leagueName}`);
};

// 5. Coin Distribution Email
export const coinDistributionTemplate = (data: EmailTemplateData & {
  coinsReceived: number;
  newBalance: number;
  distributionType: 'weekly' | 'standings_bonus' | 'league_win';
  leagueName?: string;
}) => {
  const content = `
    <h2>🪙 Coins Received!</h2>
    <p>Hi ${data.userName},</p>
    <p>You've received <strong>${data.coinsReceived} coins</strong>!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">+${data.coinsReceived}</div>
        <div class="stat-label">Coins Received</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.newBalance}</div>
        <div class="stat-label">New Balance</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.distributionType === 'weekly' ? '📅' : data.distributionType === 'standings_bonus' ? '🏆' : '💰'}</div>
        <div class="stat-label">${data.distributionType === 'weekly' ? 'Weekly' : data.distributionType === 'standings_bonus' ? 'Bonus' : 'Winnings'}</div>
      </div>
    </div>

    <div class="highlight success">
      <strong>🎉 Coins added to your account!</strong>
      ${data.distributionType === 'weekly' 
        ? 'Weekly coin distribution for active leagues.'
        : data.distributionType === 'standings_bonus'
        ? `Standings bonus from ${data.leagueName}.`
        : `League winnings from ${data.leagueName}.`
      }
    </div>

    <h3>💡 What you can do with your coins:</h3>
    <ul>
      <li>Join new leagues with buy-ins</li>
      <li>Buy players in the marketplace</li>
      <li>Purchase avatar customizations</li>
      <li>Save for future opportunities</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/join-league" class="button">Join League</a>
      <a href="https://pawn-royale.vercel.app/marketplace" class="button">Visit Marketplace</a>
    </div>
  `;
  
  return baseTemplate(content, `Coins Received - +${data.coinsReceived} coins`);
};

// 6. Marketplace Alert Email
export const marketplaceAlertTemplate = (data: EmailTemplateData & {
  playerName: string;
  playerElo: number;
  price: number;
  sellerName: string;
  timeRemaining: string;
}) => {
  const content = `
    <h2>🛒 New Player Available!</h2>
    <p>Hi ${data.userName},</p>
    <p>A new player has been listed in the marketplace for <strong>${data.leagueName}</strong>!</p>
    
    <div class="player-card" style="margin: 20px 0;">
      <div class="player-avatar">${data.playerName.charAt(0)}</div>
      <div class="player-info">
        <div class="player-name">${data.playerName}</div>
        <div class="player-stats">ELO: ${data.playerElo} • Price: ${data.price} coins</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.playerElo}</div>
        <div class="stat-label">ELO Rating</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.price}</div>
        <div class="stat-label">Price (coins)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.timeRemaining}</div>
        <div class="stat-label">Time Left</div>
      </div>
    </div>

    <div class="highlight warning">
      <strong>⏰ Act fast!</strong> This player is listed by ${data.sellerName} and may not be available for long.
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View Marketplace</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">Check Balance</a>
    </div>
  `;
  
  return baseTemplate(content, `New Player - ${data.playerName}`);
};

// 7. Lineup Reminder Email
export const lineupReminderTemplate = (data: EmailTemplateData & {
  deadline: string;
  currentLineup: Array<{name: string, elo: number}>;
  availablePlayers: Array<{name: string, elo: number}>;
}) => {
  const content = `
    <h2>⏰ Lineup Deadline Approaching!</h2>
    <p>Hi ${data.userName},</p>
    <p>Don't forget to set your lineup for <strong>${data.leagueName}</strong>!</p>
    
    <div class="highlight warning">
      <strong>⏰ Deadline:</strong> ${data.deadline}<br>
      <strong>⚠️ Warning:</strong> If you don't set a lineup, you'll score 0 points this week!
    </div>

    <h3>👥 Your Current Lineup</h3>
    ${data.currentLineup.length > 0 ? data.currentLineup.map(player => `
      <div class="player-card">
        <div class="player-avatar">${player.name.charAt(0)}</div>
        <div class="player-info">
          <div class="player-name">${player.name}</div>
          <div class="player-stats">ELO: ${player.elo}</div>
        </div>
      </div>
    `).join('') : '<p>No lineup set yet!</p>'}

    <h3>📋 Available Players</h3>
    <p>You have ${data.availablePlayers.length} players on your team to choose from:</p>
    ${data.availablePlayers.slice(0, 5).map(player => `
      <div class="player-card">
        <div class="player-avatar">${player.name.charAt(0)}</div>
        <div class="player-info">
          <div class="player-name">${player.name}</div>
          <div class="player-stats">ELO: ${player.elo}</div>
        </div>
      </div>
    `).join('')}
    ${data.availablePlayers.length > 5 ? `<p>... and ${data.availablePlayers.length - 5} more players</p>` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">Set Lineup</a>
      <a href="https://pawn-royale.vercel.app/help" class="button">Lineup Guide</a>
    </div>
  `;
  
  return baseTemplate(content, `Lineup Reminder - ${data.leagueName}`);
};

// 8. Welcome Email
export const welcomeTemplate = (data: EmailTemplateData & {
  initialCoins: number;
  firstLeague?: string;
}) => {
  const content = `
    <h2>🎉 Welcome to Pawn Royale!</h2>
    <p>Hi ${data.userName},</p>
    <p>Welcome to the ultimate fantasy chess experience! You're now ready to draft players, compete in leagues, and prove your chess management skills.</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.initialCoins}</div>
        <div class="stat-label">Starting Coins</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">50</div>
        <div class="stat-label">Weekly Bonus</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">∞</div>
        <div class="stat-label">Possibilities</div>
      </div>
    </div>

    <div class="highlight success">
      <strong>🎯 Get started now!</strong> Join your first league and start building your dream team of chess players.
    </div>

    <h3>🚀 Quick Start Guide</h3>
    <ol>
      <li><strong>Join a League:</strong> Find a league that fits your schedule</li>
      <li><strong>Draft Players:</strong> Pick 10 chess players in the snake draft</li>
      <li><strong>Set Lineups:</strong> Choose 5 players each week</li>
      <li><strong>Trade Players:</strong> Use the marketplace to improve your team</li>
      <li><strong>Win Prizes:</strong> Compete for coins and glory!</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/join-league" class="button">Join Your First League</a>
      <a href="https://pawn-royale.vercel.app/help" class="button">Learn How to Play</a>
    </div>
  `;
  
  return baseTemplate(content, 'Welcome to Pawn Royale!');
};

// Export all templates
export const emailTemplates = {
  weeklyResults: weeklyResultsTemplate,
  leagueStart: leagueStartTemplate,
  draftReminder: draftReminderTemplate,
  leagueEnd: leagueEndTemplate,
  coinDistribution: coinDistributionTemplate,
  marketplaceAlert: marketplaceAlertTemplate,
  lineupReminder: lineupReminderTemplate,
  welcome: welcomeTemplate,
}; 