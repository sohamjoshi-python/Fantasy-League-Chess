# Star Points System

## Overview

The Star Points system adds an economic layer to Fantasy Chess, allowing players to buy, sell, and trade chess players using a virtual currency called "Star Points" (⭐). **This system now fully supports bots**, allowing them to participate in the marketplace alongside human players.

## How It Works

### Earning Star Points

1. **Join Bonus**: 50 ⭐ when joining a league (humans and bots)
2. **Weekly Bonus**: 50 ⭐ every week during the league season (humans and bots)
3. **Player Sales**: Earn ⭐ by selling players to other users/bots or back to the system

### Player Pricing

Player prices are calculated based on their chess.com ELO rating using strategic tier-based pricing:
- **Tier System** (Players get 50⭐ per week):
  - **3000+ ELO**: 50 ⭐ (Super elite - costs entire week's budget)
  - **2800-2999 ELO**: 40 ⭐ (Elite players - major investment)
  - **2600-2799 ELO**: 30 ⭐ (Strong players - significant cost)
  - **2400-2599 ELO**: 20 ⭐ (Good players - moderate investment)
  - **2200-2399 ELO**: 12 ⭐ (Decent players - affordable)
  - **2000-2199 ELO**: 8 ⭐ (Average players - budget-friendly)
  - **<2000 ELO**: 3 ⭐ (Minimum price)

**Examples** (based on typical chess.com ratings):
- Magnus Carlsen (~3000+): 50 ⭐ (entire week's budget)
- Hikaru Nakamura (~2800+): 40 ⭐ (major investment)
- Strong titled players (~2600+): 30 ⭐ (significant cost)
- Club players (~2400+): 20 ⭐ (moderate investment)
- Decent players (~2200+): 12 ⭐ (affordable)
- Average players (~2000+): 8 ⭐ (budget-friendly)

### Marketplace Features

#### Buying Players
- **Initial Marketplace**: Buy players directly from the system at calculated prices
- **User/Bot Marketplace**: Buy players from other users or bots at their listed prices
- Players can only be owned by one user/bot per league

#### Selling Players
- **List for Sale**: Set your own price and wait for buyers
- **Sell to System**: Get 70% of your purchase price back immediately
- **Suggested Price**: 80% of purchase price when listing for sale

#### Trading (Future Feature)
- Trade players with other users/bots
- Include star points in trades
- Negotiate complex multi-player deals

## Bot Support

### Bot Participation
- **Bots have their own star points**: Each bot starts with 50 ⭐ and receives 50 ⭐ weekly
- **Bots can buy players**: Bots automatically purchase players from the marketplace
- **Bots can sell players**: Bots can list players for sale or sell back to the system
- **Bot marketplace view**: League owners can see bot marketplace activity

### Bot AI Strategy
- **Automatic purchasing**: Bots buy the highest ELO players they can afford
- **Strategic spending**: Bots prioritize elite players when they have sufficient star points
- **Maximum team size**: Bots stop buying when they reach 10 players
- **Weekly participation**: Bots can be set to automatically participate in the marketplace

### Bot Marketplace AI Script
```bash
# Process all bots in all active leagues
node scripts/bot-marketplace-ai.js

# Process a specific bot
node scripts/bot-marketplace-ai.js [leagueId] [botId]
```

## Database Schema

### New Tables

1. **`player_marketplace`**: Listings of players for sale (supports both users and bots)
2. **`star_point_transactions`**: Complete transaction history (supports both users and bots)
3. **`user_players`**: Tracks player ownership (supports both users and bots)
4. **`trade_offers`**: Future trading functionality (supports both users and bots)

### Modified Tables

1. **`users`**: Added `star_points` column
2. **`bots`**: Added `star_points` column
3. **`leagues`**: Enhanced with marketplace integration

## Functions

### Core Functions
- `award_weekly_star_points()`: Distributes weekly bonuses (includes bots)
- `award_join_bonus_star_points()`: Awards join bonus (supports both users and bots)
- `calculate_player_price()`: Calculates player prices
- `buy_player_from_marketplace()`: Handles player purchases (supports both users and bots)
- `list_player_for_sale()`: Lists players for sale (supports both users and bots)
- `sell_player_to_system()`: Sells players back to system (supports both users and bots)

### Bot-Specific Functions
- `auto_buy_players_for_bot()`: Automatically buys players for a bot
- `award_star_points_to_existing_bots()`: Awards initial star points to existing bots
- `migrate_existing_teams_to_user_players()`: Migrates existing teams to the new system

### Utility Functions
- `get_marketplace_listings()`: Gets available players (includes bot listings)
- `get_user_available_players()`: Gets user's/bot's owned players
- `get_user_star_points_history()`: Gets transaction history (supports both users and bots)
- `get_star_points_leaderboard()`: Shows star points rankings (includes bots)

## Setup Instructions

### 1. Run Migration
```sql
-- Copy and paste the contents of star_points_migration_with_bots.sql into Supabase SQL Editor
-- Run the migration to create all necessary tables and functions with bot support
```

### 2. Weekly Distribution
Set up a cron job or scheduled task to run:
```bash
node scripts/distribute-weekly-star-points.js
```

### 3. Bot Marketplace AI (Optional)
Set up a cron job to run bot AI periodically:
```bash
# Run every hour
0 * * * * cd /path/to/fantasy-chess-frontend && node scripts/bot-marketplace-ai.js

# Or run manually
node scripts/bot-marketplace-ai.js
```

### 4. Initial Setup
The migration automatically:
- Populates the initial marketplace for existing leagues
- Awards star points to existing bots
- Migrates existing teams to the new user_players system

## Usage

### For Human Players
1. **Join a League**: Automatically receive 50 ⭐
2. **Buy Players**: Visit the marketplace after draft completion
3. **Manage Your Team**: Buy, sell, and trade players strategically
4. **Track Progress**: View transaction history and star points balance

### For Bots
1. **Automatic Participation**: Bots automatically receive star points and can buy players
2. **AI Strategy**: Bots buy the best players they can afford
3. **Marketplace Activity**: Bots can list players for sale or sell back to the system
4. **Team Management**: Bots maintain a maximum of 10 players

### For League Creators
1. **Monitor Activity**: View marketplace activity for both humans and bots
2. **Manage Economy**: The system automatically handles star points distribution
3. **Bot Management**: Control bot marketplace participation through the AI script

## Strategic Considerations

### Buying Strategy
- **Elite Players**: Cost 40-50 ⭐ but provide consistent high performance
- **Value Players**: Mid-tier players (20-30 ⭐) offer good performance per star point
- **Budget Players**: Low-cost players (3-12 ⭐) fill roster spots efficiently

### Bot Strategy
- **ELO-First Approach**: Bots prioritize highest ELO players available
- **Budget Management**: Bots spend star points efficiently to maximize team strength
- **Market Participation**: Bots can create market activity by listing players for sale

### Market Dynamics
- **Supply and Demand**: Player prices may fluctuate based on marketplace activity
- **Bot Competition**: Bots compete with humans for the best players
- **Strategic Trading**: Players can trade with both humans and bots

## Migration Notes

### From Previous Version
If you're upgrading from the previous star points system:
1. Run the new migration (`star_points_migration_with_bots.sql`)
2. The migration will automatically handle existing data
3. Existing bots will receive initial star points
4. Existing teams will be migrated to the new system

### Bot Integration
- Existing bots will automatically receive 50 star points
- Bot teams will be migrated to the user_players table
- Bots can immediately start participating in the marketplace

## Future Enhancements

### Planned Features
- **Advanced Bot AI**: More sophisticated buying strategies
- **Bot Trading**: Bots can make trade offers to humans
- **Market Analytics**: Detailed marketplace statistics and trends
- **Seasonal Events**: Special marketplace events with unique pricing

### Bot AI Improvements
- **Performance-Based Buying**: Bots consider player performance history
- **Market Timing**: Bots can wait for better prices
- **Team Composition**: Bots optimize for balanced lineups
- **Risk Management**: Bots diversify their player portfolio

## Troubleshooting

### Common Issues
1. **Bot not buying players**: Check if bot has sufficient star points
2. **Migration errors**: Ensure all existing data is properly backed up
3. **Permission issues**: Verify RLS policies are correctly configured

### Bot AI Issues
1. **Script not running**: Check environment variables and permissions
2. **No players bought**: Verify marketplace has available players
3. **Insufficient points**: Bots need star points to participate

## Support

For issues with the star points system or bot integration:
1. Check the migration logs for any errors
2. Verify all functions are properly created
3. Test with a small league first
4. Review the bot AI script output for debugging information 