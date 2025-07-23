# Weekly Coin Distribution System

This system automatically distributes 50 coins to all players in active leagues every week.

## 📋 **What It Does**

- ✅ **Automatically detects active leagues** (leagues where `start_date <= current_date <= end_date`)
- ✅ **Distributes 50 coins** to each player in active leagues
- ✅ **Tracks distribution history** for auditing
- ✅ **Runs automatically** every Monday at 1:00 AM UTC
- ✅ **Provides detailed logging** and error handling

## 🚀 **Setup Instructions**

### **1. Apply the SQL Functions**

Run the SQL commands from `weekly-coin-distribution.sql` in your Supabase database:

```bash
# Option 1: Via Supabase Dashboard
# Go to SQL Editor and paste the contents of weekly-coin-distribution.sql

# Option 2: Via Supabase CLI
supabase db push
```

### **2. Deploy the Supabase Edge Function**

1. **Deploy the edge function**:
   ```bash
   supabase functions deploy weekly-coin-distribution
   ```

2. **Verify deployment**:
   - Go to Supabase Dashboard → Edge Functions
   - You should see `weekly-coin-distribution` listed

### **3. Set Up GitHub Actions (Recommended)**

1. **Set up GitHub Secrets** in your repository:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

2. **The workflow will run automatically** every Monday at 1:00 AM UTC

3. **Manual trigger**: Go to Actions → Weekly Coin Distribution → Run workflow

### **4. Alternative: Direct Supabase Scheduling**

If you prefer to use Supabase's built-in scheduling instead of GitHub Actions:

1. **Set up scheduling** in your Supabase dashboard:
   - Go to Edge Functions → weekly-coin-distribution
   - Add a cron schedule: `0 1 * * 1` (every Monday at 1:00 AM UTC)

## 🔧 **Manual Testing**

### **Test the Function**

```sql
-- Test the distribution function
SELECT distribute_weekly_coins_to_active_leagues_with_history();

-- Check active leagues
SELECT id, name, start_date, end_date 
FROM leagues 
WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE;

-- Check distribution history
SELECT * FROM weekly_coin_distributions ORDER BY created_at DESC LIMIT 5;
```

### **Test via API**

```bash
# Call the edge function manually
curl -X POST https://your-project.supabase.co/functions/v1/weekly-coin-distribution \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## 📊 **Monitoring**

### **Check Distribution History**

```sql
-- View recent distributions
SELECT 
  distribution_date,
  active_leagues_count,
  total_coins_distributed,
  created_at
FROM weekly_coin_distributions 
ORDER BY created_at DESC;
```

### **Check Active Leagues**

```sql
-- See which leagues are currently active
SELECT 
  id,
  name,
  start_date,
  end_date,
  member_ids
FROM leagues 
WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE;
```

### **Check Player Coin Balances**

```sql
-- See current coin balances for a specific league
SELECT 
  u.email,
  lcb.coin_balance,
  l.name as league_name
FROM league_coin_balances lcb
JOIN users u ON lcb.user_id = u.id
JOIN leagues l ON lcb.league_id = l.id
WHERE l.id = 'YOUR_LEAGUE_ID'
ORDER BY lcb.coin_balance DESC;
```

## ⚙️ **Configuration**

### **Change Distribution Schedule**

#### **GitHub Actions** (`.github/workflows/weekly-coin-distribution.yml`):
```yaml
schedule:
  # Every Monday at 1:00 AM UTC
  - cron: '0 1 * * 1'
  
  # Every Sunday at 8:00 PM EST
  # - cron: '0 1 * * 0'
  
  # Every day at 2:00 AM UTC
  # - cron: '0 2 * * *'
```

#### **Supabase Edge Function** (`supabase/config.toml`):
```toml
[edge_functions.schedules]
# Every Monday at 1:00 AM UTC
weekly_coin_distribution = "0 1 * * 1"
```

### **Change Coin Amount**

Edit the SQL function in `weekly-coin-distribution.sql`:
```sql
-- Change from 50 to your desired amount
SET coin_balance = coin_balance + 50  -- Change this number
```

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Function not found error**:
   - Ensure you've run the SQL commands from `weekly-coin-distribution.sql`
   - Check that `distribute_weekly_league_coins()` function exists

2. **No active leagues**:
   - Verify league dates: `start_date <= current_date <= end_date`
   - Check that leagues have members with coin balances

3. **Permission errors**:
   - Ensure you're using the service role key, not the anon key
   - Check RLS policies on `league_coin_balances` table

### **Debug Commands**

```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%coin%';

-- Check active leagues
SELECT COUNT(*) FROM leagues 
WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE;

-- Check coin balances
SELECT COUNT(*) FROM league_coin_balances;

-- Test manual distribution
SELECT trigger_weekly_coin_distribution();
```

## 📈 **Performance**

- **Indexes**: Added on `leagues(start_date, end_date)` for faster active league queries
- **Batch processing**: Processes all active leagues in a single function call
- **History tracking**: Minimal overhead with efficient table structure

## 🔒 **Security**

- **RLS enabled**: All tables have Row Level Security
- **Service role**: Uses service role key for administrative operations
- **Audit trail**: Complete transaction history in `coin_transactions` table
- **Error handling**: Comprehensive error logging and rollback on failures

## 📝 **Logs**

### **GitHub Actions**
- Check Actions tab in your GitHub repository
- View detailed logs for each run
- Shows HTTP response status and parsed results

### **Supabase Edge Function**
- Check Supabase Dashboard → Edge Functions → Logs
- Monitor function execution and errors
- More detailed logs for debugging distribution issues

### **Database Logs**
```sql
-- Check recent coin transactions
SELECT 
  ct.transaction_type,
  ct.amount,
  ct.description,
  ct.created_at,
  u.email
FROM coin_transactions ct
LEFT JOIN users u ON ct.user_id = u.id
WHERE ct.transaction_type = 'weekly_award'
ORDER BY ct.created_at DESC
LIMIT 10;
``` 