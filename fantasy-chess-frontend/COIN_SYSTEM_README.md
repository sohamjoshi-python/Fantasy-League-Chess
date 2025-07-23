# Fantasy Chess Coin System

## Overview

The Fantasy Chess Coin System adds a virtual economy to the fantasy chess experience, allowing users to buy and sell chess players using coins earned through weekly distributions and league participation.

## Features

### 🪙 Coin Distribution
- **Weekly Distribution**: All users and bots receive 50 coins every week
- **League Join Bonus**: New league members receive 50 coins upon joining
- **Transaction History**: Complete audit trail of all coin transactions

### 🛒 Player Marketplace
- **Buy Players**: Purchase players from the marketplace using coins
- **Sell Players**: List your owned players for sale at your chosen price
- **Strategic Pricing**: Player prices based on ELO rating tiers
- **Bot Participation**: Bots can also buy and sell players

### 💰 Pricing Strategy
Players are priced based on their ELO rating:

| ELO Range | Tier | Price (Coins) | Description |
|-----------|------|---------------|-------------|
| 2800+ | Legendary | 50 | Top-tier players (entire weekly budget) |
| 2700-2799 | Elite | 40 | Elite players (80% of weekly budget) |
| 2600-2699 | Strong | 30 | Strong players (60% of weekly budget) |
| 2500-2599 | Good | 20 | Good players (40% of weekly budget) |
| 2400-2499 | Average | 15 | Average players (30% of weekly budget) |
| 2300-2399 | Developing | 10 | Developing players (20% of weekly budget) |
| <2300 | Beginner | 5 | Beginner players (10% of weekly budget) |

### 🤖 Bot AI
- **Automatic Purchases**: Bots automatically buy the highest ELO players they can afford
- **Smart Strategy**: Bots prioritize quality over quantity
- **Market Participation**: Bots can list their players for sale

## Database Schema

### Tables

#### `users` (Extended)
- `coin_balance` (integer): Current coin balance

#### `bots` (Extended)
- `coin_balance` (integer): Current coin balance

#### `player_marketplace`
- `id` (uuid): Primary key
- `player_username` (text): Chess.com username
- `player_elo` (integer): Player's ELO rating
- `price` (integer): Selling price in coins
- `seller_id` (uuid): User who listed the player (nullable)
- `seller_bot_id` (uuid): Bot who listed the player (nullable)
- `is_bot_seller` (boolean): Whether seller is a bot
- `sold_at` (timestamp): When player was sold (nullable)
- `buyer_id` (uuid): User who bought the player (nullable)
- `buyer_bot_id` (uuid): Bot who bought the player (nullable)
- `created_at` (timestamp): Listing creation time

#### `user_players`
- `id` (uuid): Primary key
- `user_id` (uuid): Owner user ID (nullable)
- `bot_id` (uuid): Owner bot ID (nullable)
- `player_username` (text): Chess.com username
- `player_elo` (integer): Player's ELO rating
- `purchase_price` (integer): Price paid for the player
- `purchased_at` (timestamp): Purchase date

#### `coin_transactions`
- `id` (uuid): Primary key
- `user_id` (uuid): User ID (nullable)
- `bot_id` (uuid): Bot ID (nullable)
- `amount` (integer): Transaction amount (positive/negative)
- `transaction_type` (text): Type of transaction
- `description` (text): Human-readable description
- `created_at` (timestamp): Transaction timestamp

### Functions

#### `award_coins(p_user_id, p_bot_id, p_amount, p_transaction_type, p_description)`
Awards coins to a user or bot and creates a transaction record.

#### `buy_player_from_marketplace(p_marketplace_id, p_buyer_id, p_buyer_bot_id)`
Purchases a player from the marketplace, transferring coins and ownership.

#### `list_player_on_marketplace(p_player_username, p_player_elo, p_price, p_seller_id, p_seller_bot_id)`
Lists a player for sale on the marketplace.

## Frontend Components

### Marketplace Component
Located at `src/components/Marketplace.tsx`

**Features:**
- Three-tab interface: Marketplace, My Players, History
- Real-time coin balance display
- Buy/sell functionality with modal dialogs
- Transaction history with icons and colors
- Responsive design with Tailwind CSS

**Tabs:**
1. **Marketplace**: Browse and buy available players
2. **My Players**: View owned players and sell them
3. **History**: View transaction history

### Integration
The marketplace is integrated into the League page and appears after the draft is completed.

## Scripts

### Weekly Coin Distribution
```bash
npm run distribute-coins
```

**What it does:**
- Fetches all users and bots
- Awards 50 coins to each
- Creates transaction records
- Logs all activities

### Bot Marketplace AI
```bash
npm run bot-ai
```

**What it does:**
- Processes all bots
- Finds available marketplace listings
- Buys highest ELO players bots can afford
- Implements smart buying strategy

## Usage Examples

### Manual SQL Testing

```sql
-- Check user coin balance
SELECT email, coin_balance FROM users WHERE id = 'your-user-id';

-- Award coins to a user
SELECT award_coins(
  'your-user-id'::uuid,
  NULL::uuid,
  50,
  'weekly_award',
  'Weekly coin distribution'
);

-- List a player for sale
SELECT list_player_on_marketplace(
  'Hikaru',
  2800,
  50,
  'your-user-id'::uuid,
  NULL::uuid
);

-- Buy a player from marketplace
SELECT buy_player_from_marketplace(
  'marketplace-listing-id'::uuid,
  'your-user-id'::uuid,
  NULL::uuid
);
```

### Frontend Usage

1. **Access Marketplace**: Navigate to any league after draft completion
2. **Buy Players**: Click "Buy Player" on any marketplace listing
3. **Sell Players**: Click "Sell Player" on your owned players
4. **View History**: Check the History tab for transaction records

## Automation

### Weekly Distribution
Set up a cron job or scheduled task to run:
```bash
npm run distribute-coins
```

### Bot AI
Set up a cron job to run periodically:
```bash
npm run bot-ai
```

## Security

- **RLS Policies**: All tables have Row Level Security enabled
- **Function Validation**: All functions validate inputs and permissions
- **Transaction Integrity**: Database functions ensure atomic operations
- **User Isolation**: Users can only access their own data

## Future Enhancements

### Planned Features
- **Trading System**: Direct player-to-player trades
- **Market Analytics**: Price trends and market statistics
- **Auction System**: Bidding on high-value players
- **Seasonal Events**: Special coin distributions and events
- **Player Performance Bonuses**: Coins for successful players

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live marketplace updates
- **Advanced Bot AI**: More sophisticated buying strategies
- **Market Alerts**: Notifications for price changes
- **Portfolio Management**: Advanced player management tools

## Troubleshooting

### Common Issues

1. **Migration Errors**: Ensure all tables and functions are created properly
2. **Permission Errors**: Check RLS policies and user permissions
3. **Balance Issues**: Verify transaction records and coin calculations
4. **Bot AI Failures**: Check bot coin balances and marketplace availability

### Debug Commands

```sql
-- Check all coin balances
SELECT 'user' as type, email as name, coin_balance FROM users
UNION ALL
SELECT 'bot' as type, name, coin_balance FROM bots;

-- Check recent transactions
SELECT * FROM coin_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Check marketplace listings
SELECT * FROM player_marketplace 
WHERE sold_at IS NULL 
ORDER BY created_at DESC;
```

## Support

For issues or questions about the coin system:
1. Check the transaction logs in the database
2. Verify user/bot coin balances
3. Test functions manually in the SQL editor
4. Review RLS policies and permissions 