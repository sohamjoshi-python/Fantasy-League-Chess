# Complete Fantasy Chess Coin System

## Overview

The Fantasy Chess Coin System provides a comprehensive virtual economy with two main components:

1. **Weekly Coin Distribution**: 50 coins per week to all players in active leagues
2. **Standings Bonus Points**: Bonus coins awarded based on final league standings

## 🪙 Weekly Coin Distribution (Already Implemented)

### What It Does
- **Automatically distributes 50 coins** to all players in active leagues every week
- **Runs every Monday at 1:00 AM UTC** via GitHub Actions
- **Tracks distribution history** for auditing
- **Supports both users and bots**

### How It Works
1. **Detects Active Leagues**: Finds leagues where `start_date <= current_date <= end_date`
2. **Distributes Coins**: Adds 50 coins to each player's `coin_balance`
3. **Records Transactions**: Creates entries in `coin_transactions` table
4. **Tracks History**: Logs distributions in `weekly_coin_distributions` table

### Files
- **Edge Function**: `supabase/functions/weekly-coin-distribution/index.ts`
- **GitHub Actions**: `.github/workflows/weekly-coin-distribution.yml`
- **SQL Functions**: `weekly-coin-distribution.sql`

## 🏆 Standings Bonus Points (New Implementation)

### What It Does
- **Awards bonus coins** based on final league standings
- **Runs every Monday at 2:00 AM UTC** (after weekly distribution)
- **Only processes completed leagues** with processed payouts
- **Prevents duplicate distributions**

### Bonus Structure
| Rank | Bonus Points | Description |
|------|-------------|-------------|
| 1st Place | 50 points | Champion bonus |
| 2nd Place | 40 points | Runner-up bonus |
| 3rd Place | 30 points | Third place bonus |
| 4th Place | 20 points | Fourth place bonus |
| 5th+ Place | 10 points | Participation bonus |

### How It Works
1. **Finds Completed Leagues**: Identifies leagues where `end_date <= current_date` and `payout_processed = true`
2. **Calculates Standings**: Determines final rankings based on total points
3. **Awards Bonuses**: Gives bonus coins based on rank
4. **Records Transactions**: Creates detailed transaction records
5. **Prevents Duplicates**: Only processes leagues that haven't received bonuses yet

### Files
- **Edge Function**: `supabase/functions/award-standings-bonus/index.ts`
- **GitHub Actions**: `.github/workflows/standings-bonus-distribution.yml`
- **SQL Functions**: `standings-bonus-system.sql`

## 🚀 Setup Instructions

### 1. Apply the SQL Functions

Run the SQL commands from `standings-bonus-system.sql` in your Supabase database:

```bash
# Go to Supabase Dashboard → SQL Editor
# Copy and paste the contents of standings-bonus-system.sql
# Click "Run" to apply the functions
```

### 2. Deploy the Supabase Edge Function

```bash
# Deploy the standings bonus edge function
supabase functions deploy award-standings-bonus

# Verify deployment
supabase functions list
```

### 3. Set Up GitHub Actions

The workflows are already configured to run automatically:

- **Weekly Coin Distribution**: Every Monday at 1:00 AM UTC
- **Standings Bonus Distribution**: Every Monday at 2:00 AM UTC

### 4. Manual Testing

```sql
-- Test the standings bonus function
SELECT award_standings_bonus_points();

-- Check completed leagues that need bonus
SELECT id, name, end_date, payout_processed 
FROM leagues 
WHERE end_date <= CURRENT_DATE 
AND payout_processed = true
AND NOT EXISTS (
    SELECT 1 FROM standings_bonus_distributions sbd 
    WHERE sbd.league_id = leagues.id
);

-- Check distribution history
SELECT * FROM standings_bonus_distributions 
ORDER BY created_at DESC LIMIT 5;
```

## 📊 Database Schema

### New Tables

#### `standings_bonus_distributions`
- `id`: Primary key
- `league_id`: Reference to league
- `distribution_date`: Date of distribution
- `total_bonus_points_awarded`: Total bonus points given
- `participants_count`: Number of participants
- `created_at`: Timestamp

### New Functions

#### `calculate_standings_bonus(rank_position)`
Returns bonus points based on rank (50, 40, 30, 20, 10)

#### `award_standings_bonus_for_league(league_id)`
Awards bonus points to all participants in a specific league

#### `award_standings_bonus_points()`
Main function that processes all completed leagues

### Updated Tables

#### `coin_transactions`
- Added `'standings_bonus'` to transaction types

## 🔧 Configuration

### Change Bonus Amounts

Edit the `calculate_standings_bonus` function in `standings-bonus-system.sql`:

```sql
CREATE OR REPLACE FUNCTION calculate_standings_bonus(rank_position INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE 
        WHEN rank_position = 1 THEN 50  -- Change this value
        WHEN rank_position = 2 THEN 40  -- Change this value
        WHEN rank_position = 3 THEN 30  -- Change this value
        WHEN rank_position = 4 THEN 20  -- Change this value
        WHEN rank_position >= 5 THEN 10 -- Change this value
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;
```

### Change Schedule

Edit the GitHub Actions workflows:

```yaml
# In .github/workflows/standings-bonus-distribution.yml
schedule:
  # Every Monday at 2:00 AM UTC
  - cron: '0 2 * * 1'
  
  # Every Sunday at 8:00 PM EST
  # - cron: '0 1 * * 0'
```

## 📈 Monitoring

### Check Distribution Status

```sql
-- View recent standings bonus distributions
SELECT 
  sbd.distribution_date,
  l.name as league_name,
  sbd.total_bonus_points_awarded,
  sbd.participants_count,
  sbd.created_at
FROM standings_bonus_distributions sbd
JOIN leagues l ON sbd.league_id = l.id
ORDER BY sbd.created_at DESC;

-- Check user coin balances
SELECT 
  u.email,
  u.coin_balance,
  COUNT(ct.id) as transaction_count
FROM users u
LEFT JOIN coin_transactions ct ON u.id = ct.user_id
WHERE ct.transaction_type = 'standings_bonus'
GROUP BY u.id, u.email, u.coin_balance
ORDER BY u.coin_balance DESC;
```

### Check for Issues

```sql
-- Find leagues that should have received bonus but didn't
SELECT 
  l.id,
  l.name,
  l.end_date,
  l.payout_processed,
  CASE 
    WHEN sbd.id IS NULL THEN 'NEEDS_BONUS'
    ELSE 'BONUS_AWARDED'
  END as status
FROM leagues l
LEFT JOIN standings_bonus_distributions sbd ON l.id = sbd.league_id
WHERE l.end_date <= CURRENT_DATE
AND l.payout_processed = true;
```

## 🔒 Security

- **RLS Enabled**: All tables have Row Level Security
- **Service Role**: Uses service role key for administrative operations
- **Audit Trail**: Complete transaction history
- **Duplicate Prevention**: Prevents multiple bonus distributions per league
- **Validation**: Checks league completion and payout status

## 🚨 Troubleshooting

### Common Issues

1. **No leagues processed**:
   - Check if leagues have `payout_processed = true`
   - Verify `end_date <= current_date`
   - Ensure leagues have participants with lineups

2. **Permission errors**:
   - Verify service role key is correct
   - Check RLS policies on tables
   - Ensure functions have proper permissions

3. **Duplicate distributions**:
   - Check `standings_bonus_distributions` table
   - Function prevents duplicates automatically

### Debug Commands

```sql
-- Test individual league bonus
SELECT award_standings_bonus_for_league('your-league-id'::UUID);

-- Check function permissions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%standings%';

-- Verify table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'standings_bonus_distributions';
```

## 📝 Logs

### GitHub Actions
- Check Actions tab in your GitHub repository
- View detailed logs for each run
- Shows HTTP response status and parsed results

### Supabase Edge Function
- Check Supabase Dashboard → Edge Functions → Logs
- Monitor function execution and errors
- Detailed logs for debugging distribution issues

## 🎯 Benefits

### For Players
- **Weekly Income**: Consistent 50 coins per week
- **Performance Rewards**: Bonus coins for good standings
- **Fair Distribution**: Everyone gets participation bonus
- **Transparent System**: Clear transaction history

### For League Management
- **Automated Processing**: No manual intervention needed
- **Audit Trail**: Complete record of all distributions
- **Scalable**: Handles multiple leagues simultaneously
- **Error Prevention**: Built-in safeguards against duplicates

## 🔄 Integration

The standings bonus system integrates seamlessly with:

- **Weekly Coin Distribution**: Runs after weekly distribution
- **League Payout System**: Only processes leagues with completed payouts
- **Transaction History**: All bonuses recorded in `coin_transactions`
- **Marketplace**: Bonus coins can be used for player purchases
- **User Interface**: Bonus transactions appear in transaction history

## 📊 Performance

- **Indexes**: Added on key columns for efficient querying
- **Batch Processing**: Processes all eligible leagues in single function call
- **Minimal Overhead**: Efficient table structure and queries
- **Scalable**: Handles large numbers of leagues and participants

This complete system provides a robust, automated coin economy that rewards both participation and performance in Fantasy Chess leagues. 