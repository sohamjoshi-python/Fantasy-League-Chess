# 📊 Populate Leaderboard with Sample Data

## Overview
This script populates your leaderboard with **8 demo users** who have completed **4 past leagues** with **very low scores** (7-23 points per week). This makes it easy for real users to beat them and climb the leaderboard!

## 🎯 What Gets Created

### Demo Users (with low scores):
1. **ChessNovice** - 1 win, ~66.8 total points
2. **PawnPusher** - 0 wins, ~47.8 total points  
3. **RookiePlayer** - 1 win, ~79.8 total points
4. **CasualGamer** - 0 wins, ~41.7 total points
5. **Beginner99** - 1 win, ~69.4 total points
6. **FirstTimer** - 0 wins, ~58.9 total points
7. **LearningChess** - 1 win, ~74.2 total points
8. **TryingMyBest** - 0 wins, ~38.2 total points

### Demo Leagues (all completed):
- **Beginner League Alpha** - Ended 10 days ago, $5 entry
- **Starter Cup** - Ended 15 days ago, $10 entry
- **Casual Players League** - Ended 20 days ago, $5 entry
- **First Timers Tournament** - Ended 25 days ago, $10 entry

### Leaderboard Functions:
- `get_league_wins_leaderboard()` - Shows users with most league wins
- `get_total_points_leaderboard()` - Shows users with highest total points
- `get_recent_winners()` - Shows winners from last 30 days
- `get_weekly_top_performers(week_date)` - Shows top performers for a specific week

## 🚀 How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project: **Fantasy-Chess**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `populate_leaderboard_sample_data.sql`
6. Paste into the query editor
7. Click **Run** (or press Ctrl+Enter)
8. You should see: ✅ **Success. No rows returned**

### Option 2: Command Line (if you have Supabase CLI)
```bash
cd fantasy-chess-frontend
npx supabase db push --file populate_leaderboard_sample_data.sql
```

## ✅ Verify It Worked

### Check Leaderboard Page:
1. Go to your app: http://localhost:5173 (or your deployed URL)
2. Click **Leaderboard** in the navigation
3. You should see:
   - **League Wins** tab: 4 users with 1 win each
   - **Total Points** tab: 8 users with 38-80 points
   - **Recent Winners** tab: 4 recent winners with $20-$60 prizes
   - **Weekly Top Performers** tab: Top performers from recent weeks

### Check Database Directly:
Run these queries in Supabase SQL Editor to verify:

```sql
-- View demo users
SELECT username, email FROM users WHERE email LIKE 'demo%@example.com';

-- View demo leagues
SELECT name, start_date, end_date, entry_fee, winner_id 
FROM leagues 
WHERE name IN ('Beginner League Alpha', 'Starter Cup', 'Casual Players League', 'First Timers Tournament');

-- View total points (should be low!)
SELECT u.username, SUM(ln.total_points) as total_points
FROM users u
JOIN lineups ln ON u.id = ln.user_id
WHERE u.email LIKE 'demo%@example.com'
GROUP BY u.username
ORDER BY total_points DESC;

-- Test leaderboard functions
SELECT * FROM get_league_wins_leaderboard();
SELECT * FROM get_total_points_leaderboard();
SELECT * FROM get_recent_winners();
```

## 🎮 Score Breakdown

### Why These Scores Are Easy to Beat:
- **Weekly scores**: 7-23 points (very low!)
- **Average per week**: ~13 points
- **Total scores**: 38-80 points over 4 weeks
- **Real users** with decent lineups should easily score 25-40+ points per week

### Sample Weekly Performance:
```
ChessNovice Week 1: 12.5 pts   ← Easy to beat!
ChessNovice Week 2: 15.8 pts
ChessNovice Week 3: 18.4 pts
ChessNovice Week 4: 20.1 pts
Total: 66.8 pts
```

## 🧹 Clean Up (Optional)

If you want to remove the sample data later:

```sql
-- Delete demo lineups
DELETE FROM lineups WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'demo%@example.com'
);

-- Delete demo leagues
DELETE FROM leagues WHERE name IN (
  'Beginner League Alpha', 
  'Starter Cup', 
  'Casual Players League', 
  'First Timers Tournament'
);

-- Delete demo users
DELETE FROM users WHERE email LIKE 'demo%@example.com';
```

## 📝 Notes

- ✅ All scores are **intentionally low** (7-23 points per week)
- ✅ Demo users have **realistic but beatable** totals
- ✅ Leagues are **already completed** (past end dates)
- ✅ Winners are **assigned** for recent winners display
- ✅ Functions are **granted to authenticated and anon** users
- ✅ Safe to run multiple times (uses `ON CONFLICT DO NOTHING`)

## 🎯 Result

After applying this script:
- Your leaderboard will have **8 active demo users**
- All with **low, easy-to-beat scores**
- **4 completed leagues** with recent winners
- New users can easily **climb above them** with good performance!

---

**Ready to apply?** Just copy `populate_leaderboard_sample_data.sql` into Supabase SQL Editor and run it! 🚀

