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

// 9. League Created Email
export const leagueCreatedTemplate = (data: EmailTemplateData & {
  buyIn: number;
  startDate: string;
  endDate: string;
}) => {
  const content = `
    <h2>🎉 League Created Successfully!</h2>
    <p>Hi ${data.userName},</p>
    <p>Congratulations! You've successfully created <strong>${data.leagueName}</strong>!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.buyIn}</div>
        <div class="stat-label">Buy-in (coins)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.startDate}</div>
        <div class="stat-label">Start Date</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.endDate}</div>
        <div class="stat-label">End Date</div>
      </div>
    </div>

    <div class="highlight success">
      <strong>🚀 Your league is ready!</strong> Share the league code with friends and start building your fantasy chess empire.
    </div>

    <h3>📋 Next Steps</h3>
    <ul>
      <li>Share the league code with potential members</li>
      <li>Set up your league rules and settings</li>
      <li>Prepare for the draft when members join</li>
      <li>Monitor league activity and engagement</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View League</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">Go to Dashboard</a>
    </div>
  `;
  
  return baseTemplate(content, `League Created - ${data.leagueName}`);
};

// 10. League Joined Email
export const leagueJoinedTemplate = (data: EmailTemplateData & {
  memberCount: number;
  buyIn: number;
}) => {
  const content = `
    <h2>🎯 Welcome to the League!</h2>
    <p>Hi ${data.userName},</p>
    <p>You've successfully joined <strong>${data.leagueName}</strong>!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.memberCount}</div>
        <div class="stat-label">Members</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.buyIn}</div>
        <div class="stat-label">Buy-in (coins)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">🎯</div>
        <div class="stat-label">Ready to Play</div>
      </div>
    </div>

    <div class="highlight success">
      <strong>🎉 You're in!</strong> Get ready to draft players and compete for glory in ${data.leagueName}.
    </div>

    <h3>📅 What's Next?</h3>
    <ul>
      <li>Wait for the league to fill up</li>
      <li>Prepare for the snake draft</li>
      <li>Research chess players and their ELO ratings</li>
      <li>Set your weekly lineups when the league starts</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View League</a>
      <a href="https://pawn-royale.vercel.app/help" class="button">How to Play</a>
    </div>
  `;
  
  return baseTemplate(content, `Welcome to ${data.leagueName}!`);
};

// 11. League Starting Soon Email
export const leagueStartingSoonTemplate = (data: EmailTemplateData & {
  daysUntilStart: number;
  startDate: string;
}) => {
  const content = `
    <h2>⏰ League Starting Soon!</h2>
    <p>Hi ${data.userName},</p>
    <p><strong>${data.leagueName}</strong> starts in <strong>${data.daysUntilStart} days</strong>!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.daysUntilStart}</div>
        <div class="stat-label">Days Left</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.startDate}</div>
        <div class="stat-label">Start Date</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">🎯</div>
        <div class="stat-label">Get Ready</div>
      </div>
    </div>

    <div class="highlight warning">
      <strong>⏰ Time to prepare!</strong> Make sure you're ready for the draft and have researched your potential players.
    </div>

    <h3>📋 Preparation Checklist</h3>
    <ul>
      <li>Review chess player ELO ratings and recent form</li>
      <li>Plan your draft strategy</li>
      <li>Set aside time for the draft</li>
      <li>Familiarize yourself with the scoring system</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View League</a>
      <a href="https://pawn-royale.vercel.app/help" class="button">Draft Guide</a>
    </div>
  `;
  
  return baseTemplate(content, `${data.leagueName} starts in ${data.daysUntilStart} days!`);
};

// 12. Draft Starting Soon Email
export const draftStartingSoonTemplate = (data: EmailTemplateData & {
  hoursUntilDraft: number;
  draftTime: string;
}) => {
  const content = `
    <h2>⚡ Draft Starting Soon!</h2>
    <p>Hi ${data.userName},</p>
    <p>The draft for <strong>${data.leagueName}</strong> starts in <strong>${data.hoursUntilDraft} hours</strong>!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.hoursUntilDraft}</div>
        <div class="stat-label">Hours Left</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.draftTime}</div>
        <div class="stat-label">Draft Time</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">🎯</div>
        <div class="stat-label">Be Ready</div>
      </div>
    </div>

    <div class="highlight warning">
      <strong>⚡ Don't miss your turn!</strong> The snake draft will start at ${data.draftTime}. Make sure you're online and ready to pick.
    </div>

    <h3>🎯 Draft Strategy Tips</h3>
    <ul>
      <li>Research player ELO ratings and recent performance</li>
      <li>Consider players who compete frequently in tournaments</li>
      <li>Balance high-rated players with consistent performers</li>
      <li>Remember the snake draft format (alternating order)</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">Join Draft</a>
      <a href="https://pawn-royale.vercel.app/help" class="button">Draft Guide</a>
    </div>
  `;
  
  return baseTemplate(content, `Draft for ${data.leagueName} starts in ${data.hoursUntilDraft} hours!`);
};

// 13. Draft Turn Reminder Email
export const draftTurnReminderTemplate = (data: EmailTemplateData & {
  playerName: string;
}) => {
  const content = `
    <h2>🎯 Your Turn to Draft!</h2>
    <p>Hi ${data.userName},</p>
    <p>It's your turn to pick in the draft for <strong>${data.leagueName}</strong>!</p>
    
    <div class="highlight warning">
      <strong>⏰ Your turn is now!</strong> Don't keep other players waiting. Make your selection quickly.
    </div>

    <h3>🎯 Quick Pick Options</h3>
    <p>Consider these high-value players:</p>
    <ul>
      <li>${data.playerName} - Strong recent form</li>
      <li>Check ELO ratings and tournament frequency</li>
      <li>Balance your team composition</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">Make Your Pick</a>
    </div>
  `;
  
  return baseTemplate(content, `Your turn to draft in ${data.leagueName}!`);
};

// 14. Titled Tuesday Reminder Email
export const titledTuesdayReminderTemplate = (data: EmailTemplateData & {
  hoursUntilEvent: number;
}) => {
  const content = `
    <h2>🏆 Titled Tuesday Reminder!</h2>
    <p>Hi ${data.userName},</p>
    <p>Titled Tuesday starts in <strong>${data.hoursUntilEvent} hours</strong> for <strong>${data.leagueName}</strong>!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.hoursUntilEvent}</div>
        <div class="stat-label">Hours Left</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">🏆</div>
        <div class="stat-label">Tournament</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">📊</div>
        <div class="stat-label">Points Time</div>
      </div>
    </div>

    <div class="highlight warning">
      <strong>⏰ Make sure your lineup is set!</strong> Points will be calculated based on your selected players' performance.
    </div>

    <h3>📋 Pre-Tournament Checklist</h3>
    <ul>
      <li>Verify your weekly lineup is set</li>
      <li>Check that your players are competing</li>
      <li>Review your team's recent performance</li>
      <li>Monitor the tournament for live updates</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">Check Lineup</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">View Dashboard</a>
    </div>
  `;
  
  return baseTemplate(content, `Titled Tuesday starts in ${data.hoursUntilEvent} hours!`);
};

// 15. Lineup Deadline Reminder Email
export const lineupDeadlineReminderTemplate = (data: EmailTemplateData & {
  hoursUntilDeadline: number;
}) => {
  const content = `
    <h2>⏰ Lineup Deadline Approaching!</h2>
    <p>Hi ${data.userName},</p>
    <p>Your lineup deadline for <strong>${data.leagueName}</strong> is in <strong>${data.hoursUntilDeadline} hours</strong>!</p>
    
    <div class="highlight warning">
      <strong>⚠️ Don't miss the deadline!</strong> If you don't set a lineup, you'll score 0 points this week.
    </div>

    <h3>📋 Quick Lineup Setup</h3>
    <ul>
      <li>Select your 5 best players for this week</li>
      <li>Consider recent form and ELO ratings</li>
      <li>Check if players are competing in tournaments</li>
      <li>Save your lineup before the deadline</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">Set Lineup Now</a>
      <a href="https://pawn-royale.vercel.app/help" class="button">Lineup Guide</a>
    </div>
  `;
  
  return baseTemplate(content, `Lineup deadline in ${data.hoursUntilDeadline} hours!`);
};

// 16. Player Listed Email
export const playerListedTemplate = (data: EmailTemplateData & {
  playerName: string;
  playerElo: number;
  price: number;
  sellerName: string;
}) => {
  const content = `
    <h2>🛒 New Player Listed!</h2>
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
        <div class="stat-value">${data.sellerName}</div>
        <div class="stat-label">Seller</div>
      </div>
    </div>

    <div class="highlight warning">
      <strong>⏰ Act fast!</strong> This player was listed by ${data.sellerName} and may not be available for long.
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View Marketplace</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">Check Balance</a>
    </div>
  `;
  
  return baseTemplate(content, `New player listed: ${data.playerName}`);
};

// 17. Player Purchased Email
export const playerPurchasedTemplate = (data: EmailTemplateData & {
  playerName: string;
  playerElo: number;
  price: number;
  sellerName: string;
}) => {
  const content = `
    <h2>✅ Player Purchased!</h2>
    <p>Hi ${data.userName},</p>
    <p>Congratulations! You've successfully purchased <strong>${data.playerName}</strong> for <strong>${data.price} coins</strong>!</p>
    
    <div class="player-card" style="margin: 20px 0;">
      <div class="player-avatar">${data.playerName.charAt(0)}</div>
      <div class="player-info">
        <div class="player-name">${data.playerName}</div>
        <div class="player-stats">ELO: ${data.playerElo} • Purchased for ${data.price} coins</div>
      </div>
    </div>

    <div class="highlight success">
      <strong>🎉 Great acquisition!</strong> ${data.playerName} is now part of your team in ${data.leagueName}.
    </div>

    <h3>📋 Next Steps</h3>
    <ul>
      <li>Add ${data.playerName} to your weekly lineup</li>
      <li>Monitor their upcoming tournament performance</li>
      <li>Consider trading other players to optimize your team</li>
      <li>Track your team's overall performance</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View Team</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">Set Lineup</a>
    </div>
  `;
  
  return baseTemplate(content, `Player purchased: ${data.playerName}`);
};

// 18. Player Sold Email
export const playerSoldTemplate = (data: EmailTemplateData & {
  playerName: string;
  playerElo: number;
  price: number;
  buyerName: string;
}) => {
  const content = `
    <h2>💰 Player Sold!</h2>
    <p>Hi ${data.userName},</p>
    <p>Great news! You've sold <strong>${data.playerName}</strong> for <strong>${data.price} coins</strong>!</p>
    
    <div class="player-card" style="margin: 20px 0;">
      <div class="player-avatar">${data.playerName.charAt(0)}</div>
      <div class="player-info">
        <div class="player-name">${data.playerName}</div>
        <div class="player-stats">ELO: ${data.playerElo} • Sold for ${data.price} coins</div>
      </div>
    </div>

    <div class="highlight success">
      <strong>💰 Coins added to your balance!</strong> You can now use these coins to buy other players or join new leagues.
    </div>

    <h3>📊 Transaction Details</h3>
    <ul>
      <li><strong>Player:</strong> ${data.playerName}</li>
      <li><strong>ELO Rating:</strong> ${data.playerElo}</li>
      <li><strong>Sale Price:</strong> ${data.price} coins</li>
      <li><strong>Buyer:</strong> ${data.buyerName}</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View Marketplace</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">Check Balance</a>
    </div>
  `;
  
  return baseTemplate(content, `Player sold: ${data.playerName}`);
};

// 19. Weekly Performance Email
export const weeklyPerformanceTemplate = (data: EmailTemplateData & {
  week: string;
  rank: number;
  points: number;
  totalPlayers: number;
  bestPlayer: string;
  worstPlayer: string;
  improvement: number;
}) => {
  const content = `
    <h2>📊 Weekly Performance Report</h2>
    <p>Hi ${data.userName},</p>
    <p>Here's your detailed performance report for <strong>Week ${data.week}</strong> in <strong>${data.leagueName}</strong>!</p>
    
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

    <div class="highlight ${data.improvement > 0 ? 'success' : 'warning'}">
      <strong>${data.improvement > 0 ? '📈' : '📉'} Performance ${data.improvement > 0 ? 'Improvement' : 'Change'}</strong>
      ${data.improvement > 0 ? `You improved by ${data.improvement} points from last week!` : `You scored ${Math.abs(data.improvement)} points less than last week.`}
    </div>

    <h3>👥 Player Performance</h3>
    <div class="player-card">
      <div class="player-avatar">🏆</div>
      <div class="player-info">
        <div class="player-name">Best Performer: ${data.bestPlayer}</div>
        <div class="player-stats">Your highest-scoring player this week</div>
      </div>
    </div>
    <div class="player-card">
      <div class="player-avatar">📉</div>
      <div class="player-info">
        <div class="player-name">Needs Improvement: ${data.worstPlayer}</div>
        <div class="player-stats">Consider replacing in your lineup</div>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View Full Results</a>
      <a href="https://pawn-royale.vercel.app/marketplace" class="button">Trade Players</a>
    </div>
  `;
  
  return baseTemplate(content, `Week ${data.week} Performance - ${data.leagueName}`);
};

// 20. Achievement Unlocked Email
export const achievementUnlockedTemplate = (data: EmailTemplateData & {
  achievementName: string;
  achievementDescription: string;
  achievementIcon: string;
  pointsEarned: number;
}) => {
  const content = `
    <h2>🏆 Achievement Unlocked!</h2>
    <p>Hi ${data.userName},</p>
    <p>Congratulations! You've unlocked the <strong>${data.achievementName}</strong> achievement!</p>
    
    <div class="highlight success">
      <div style="text-align: center; margin: 20px 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">${data.achievementIcon}</div>
        <h3 style="margin: 0; color: white;">${data.achievementName}</h3>
        <p style="margin: 10px 0 0; opacity: 0.9;">${data.achievementDescription}</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">🏆</div>
        <div class="stat-label">Achievement</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">+${data.pointsEarned}</div>
        <div class="stat-label">Points Earned</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">🎉</div>
        <div class="stat-label">Congratulations</div>
      </div>
    </div>

    <h3>🎯 Keep Going!</h3>
    <p>You're on a roll! Continue playing to unlock more achievements and climb the leaderboards.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">View Achievements</a>
      <a href="https://pawn-royale.vercel.app/leaderboard" class="button">Check Leaderboard</a>
    </div>
  `;
  
  return baseTemplate(content, `Achievement Unlocked: ${data.achievementName}!`);
};

// 21. Rivalry Alert Email
export const rivalryAlertTemplate = (data: EmailTemplateData & {
  rivalName: string;
  rivalryType: string;
  rivalryStats: any;
}) => {
  const content = `
    <h2>⚔️ Rivalry Alert!</h2>
    <p>Hi ${data.userName},</p>
    <p>Your rival <strong>${data.rivalName}</strong> just made a move in <strong>${data.leagueName}</strong>!</p>
    
    <div class="highlight warning">
      <strong>⚔️ The competition is heating up!</strong> ${data.rivalName} has ${data.rivalryType.toLowerCase()} and is gaining ground.
    </div>

    <h3>📊 Rivalry Stats</h3>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.rivalryStats.yourRank}</div>
        <div class="stat-label">Your Rank</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.rivalryStats.rivalRank}</div>
        <div class="stat-label">${data.rivalName}'s Rank</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.rivalryStats.pointDifference}</div>
        <div class="stat-label">Point Difference</div>
      </div>
    </div>

    <h3>🎯 Time to Respond!</h3>
    <ul>
      <li>Check your lineup and make adjustments</li>
      <li>Consider trading players to improve your team</li>
      <li>Monitor ${data.rivalName}'s moves</li>
      <li>Focus on your strategy to stay ahead</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View League</a>
      <a href="https://pawn-royale.vercel.app/marketplace" class="button">Trade Players</a>
    </div>
  `;
  
  return baseTemplate(content, `Rivalry Alert: ${data.rivalName} in ${data.leagueName}`);
};

// 22. Standings Update Email
export const standingsUpdateTemplate = (data: EmailTemplateData & {
  oldRank: number;
  newRank: number;
  rankChange: number;
  pointsChange: number;
}) => {
  const content = `
    <h2>📈 Standings Update!</h2>
    <p>Hi ${data.userName},</p>
    <p>Your position in <strong>${data.leagueName}</strong> has changed!</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">#${data.oldRank}</div>
        <div class="stat-label">Previous Rank</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">#${data.newRank}</div>
        <div class="stat-label">New Rank</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.rankChange > 0 ? '+' : ''}${data.rankChange}</div>
        <div class="stat-label">Rank Change</div>
      </div>
    </div>

    <div class="highlight ${data.rankChange < 0 ? 'success' : 'warning'}">
      <strong>${data.rankChange < 0 ? '📈' : '📉'} ${data.rankChange < 0 ? 'You moved up!' : 'You moved down.'}</strong>
      ${data.rankChange < 0 ? `Congratulations on climbing ${Math.abs(data.rankChange)} positions!` : `You dropped ${data.rankChange} positions. Time to bounce back!`}
    </div>

    <h3>📊 Point Changes</h3>
    <p>Your total points changed by <strong>${data.pointsChange > 0 ? '+' : ''}${data.pointsChange}</strong> points.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://pawn-royale.vercel.app/league/${data.leagueId}" class="button">View Standings</a>
      <a href="https://pawn-royale.vercel.app/dashboard" class="button">Check Performance</a>
    </div>
  `;
  
  return baseTemplate(content, `Standings Update - ${data.leagueName}`);
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
  leagueCreated: leagueCreatedTemplate,
  leagueJoined: leagueJoinedTemplate,
  leagueStartingSoon: leagueStartingSoonTemplate,
  draftStartingSoon: draftStartingSoonTemplate,
  draftTurnReminder: draftTurnReminderTemplate,
  titledTuesdayReminder: titledTuesdayReminderTemplate,
  lineupDeadlineReminder: lineupDeadlineReminderTemplate,
  playerListed: playerListedTemplate,
  playerPurchased: playerPurchasedTemplate,
  playerSold: playerSoldTemplate,
  weeklyPerformance: weeklyPerformanceTemplate,
  achievementUnlocked: achievementUnlockedTemplate,
  rivalryAlert: rivalryAlertTemplate,
  standingsUpdate: standingsUpdateTemplate,
}; 