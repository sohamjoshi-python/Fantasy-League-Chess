# 📊 Leaderboard Setup Guide

## Quick Start (Recommended)

The easiest way to set up the leaderboard is to just create the functions. The leaderboard will populate naturally as users play!

### ✅ Step 1: Create Leaderboard Functions

1. Go to https://supabase.com/dashboard
2. Select your **Fantasy-Chess** project
3. Click **SQL Editor** → **New Query**
4. Copy the entire contents of `create_leaderboard_functions_only.sql`
5. Paste and click **Run**

That's it! The leaderboard is now ready and will populate automatically as:
- ✅ Users complete leagues (wins leaderboard)
- ✅ Users earn points (points leaderboard)
- ✅ Leagues end with winners (recent winners)
- ✅ Users set weekly lineups (weekly performers)

---

## Alternative: Add Sample Data (Manual)

If you want to populate the leaderboard with low-scoring demo users right away, you can manually create some test accounts and add data for them.

### Why Manual?

The `users` table in Supabase is linked to the authentication system (`auth.users`), so we can't directly insert users via SQL. You'll need to:

1. **Create 8 test accounts** through your app's sign-up page:
   - ChessNovice@test.com
   - PawnPusher@test.com
   - RookiePlayer@test.com
   - CasualGamer@test.com
   - Beginner99@test.com
   - FirstTimer@test.com
   - LearningChess@test.com
   - TryingMyBest@test.com

2. **Get their UUIDs** from the database:
```sql
SELECT id, username FROM users WHERE email LIKE '%@test.com' ORDER BY created_at;
```

3. **Manually insert leagues and lineups** using those UUIDs

This is complex and time-consuming, so we recommend just letting real users populate the leaderboard naturally!

---

## What Gets Created

### 🏆 Four Leaderboard Functions:

#### 1. `get_league_wins_leaderboard()`
Shows users with the most league victories.

**Returns:**
- user_id
- username
- wins (number of leagues won)
- total_leagues (total leagues participated in)
- total_prize_money (sum of all prize winnings)
- avatar_url

#### 2. `get_total_points_leaderboard()`
Shows users with the highest cumulative points.

**Returns:**
- user_id
- username
- total_points (sum across all lineups)
- leagues_played
- average_points_per_league
- avatar_url

#### 3. `get_recent_winners()`
Shows winners from the last 30 days.

**Returns:**
- user_id
- username
- league_name
- prize_amount
- won_date
- avatar_url

#### 4. `get_weekly_top_performers(week_date)`
Shows top performers for a specific week.

**Parameters:**
- `week_date` - DATE (format: '2025-01-13')

**Returns:**
- user_id
- username
- league_name
- week_points
- avatar_url

---

## Testing the Leaderboard

After creating the functions, test them in SQL Editor:

```sql
-- Test League Wins (will be empty initially)
SELECT * FROM get_league_wins_leaderboard();

-- Test Total Points (will be empty initially)
SELECT * FROM get_total_points_leaderboard();

-- Test Recent Winners (will be empty initially)
SELECT * FROM get_recent_winners();

-- Test Weekly Performers (replace with actual week date)
SELECT * FROM get_weekly_top_performers('2025-01-13');
```

---

## How to See Data on Leaderboard

The leaderboard will automatically populate as users:

### For "League Wins" Tab:
1. Create a league
2. Play through the league weeks
3. Let the league end
4. System determines winner
5. Winner appears on leaderboard!

### For "Total Points" Tab:
1. Users set lineups each week
2. Points are calculated based on player performance
3. Users with highest cumulative points appear!

### For "Recent Winners" Tab:
1. Leagues need to complete (reach end_date)
2. Winners appear automatically
3. Shows last 30 days of winners

### For "Weekly Top Performers" Tab:
1. Users set lineups for current week
2. Week completes (Tuesday Titled Tuesday tournament)
3. Points are calculated
4. Top performers for that week appear!

---

## Natural Growth Strategy

Instead of fake sample data, let your leaderboard grow naturally:

### Week 1-2: Bootstrap Phase
- Encourage early users to create leagues
- Set competitive entry fees ($5-$10)
- Promote weekly participation

### Week 3-4: Early Competition
- First leagues complete
- First winners appear on leaderboard
- Recent winners tab becomes active

### Month 2: Established Leaderboard
- Multiple completed leagues
- Clear point leaders emerge
- Weekly performers show consistent names
- Healthy competition develops!

---

## Benefits of Natural Growth

✅ **Authentic Competition** - Real users, real scores  
✅ **No Confusion** - Users know everyone on leaderboard is real  
✅ **True Rankings** - Actual skill-based rankings  
✅ **Better Motivation** - Users chase real people, not fake accounts  
✅ **Easier Maintenance** - No fake data to manage  

---

## Troubleshooting

### Leaderboard shows "No data"
**Normal!** This means:
- No leagues have completed yet
- No users have set lineups yet
- System is working, just waiting for activity

### Functions return errors
1. Make sure all 4 functions created successfully
2. Check permissions are granted
3. Verify tables exist: `users`, `leagues`, `lineups`

### Can't see my data
1. Check that your league has `end_date` in the past
2. Verify `total_points > 0` in lineups table
3. Ensure `winner_id` is set in leagues table

---

## Ready to Launch! 🚀

Just run `create_leaderboard_functions_only.sql` and you're good to go!

The leaderboard will start showing data as soon as:
- First league completes ✅
- First lineup earns points ✅
- First week ends ✅

**Pro tip:** Create your first league with a short duration (1-2 weeks) so the leaderboard populates quickly!

