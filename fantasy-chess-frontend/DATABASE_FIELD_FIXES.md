# Database Field Mapping Fixes

## Issue
The player history feature was not showing data because the component was using incorrect column names from the database.

## Database Schema (Actual Structure)

### `chess_players` table
```sql
- id: UUID
- name: TEXT (unique)
- elo: INTEGER
- fide_id: TEXT
- country: TEXT
- accuracy: DECIMAL(10,2)  ← Average Centipawn Loss
- games: INTEGER           ← Total games played
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### `games` table
```sql
- id: UUID
- early_late: TEXT (tournament session)
- date: TEXT
- white: TEXT (player name, not UUID)
- black: TEXT (player name, not UUID)
- result: TEXT ('1-0', '0-1', '1/2-1/2')
- white_accuracy: DECIMAL(10,2)  ← White's ACL
- black_accuracy: DECIMAL(10,2)  ← Black's ACL
- round: TEXT
- white_points: DECIMAL(5,2)
- black_points: DECIMAL(5,2)
- created_at: TIMESTAMP
```

## Changes Made

### 1. TypeScript Types (`src/types/index.ts`)
**Added**:
- `accuracy?: number` - The actual database column for ACL
- Kept `average_centipawn_loss?: number` for legacy compatibility

### 2. PlayerDetailModal (`src/components/PlayerDetailModal.tsx`)
**Changed**:
- ACL display: `player.accuracy?.toFixed(1) || player.average_centipawn_loss?.toFixed(1)`
- Third stat changed from "Total Points" to "Games Played" using `player.games`

### 3. PlayerHistory Page (`src/pages/PlayerHistory.tsx`)

**Updated GameResult interface**:
```typescript
interface GameResult {
  id: string
  date: string              // Changed from week_start_date
  white: string             // Player name (was white_player_id UUID)
  black: string             // Player name (was black_player_id UUID)
  result: string
  white_accuracy: number    // Changed from white_acl
  black_accuracy: number    // Changed from black_acl
  round: string            // Changed from tournament_round
  white_points: number
  black_points: number
  early_late: string       // Added (tournament session)
}
```

**Updated games query**:
```typescript
// OLD (incorrect - game_results table doesn't exist with UUIDs)
.from('game_results')
.or(`white_player_id.eq.${playerId},black_player_id.eq.${playerId}`)

// NEW (correct - games table uses player names)
.from('games')
.or(`white.eq.${playerData.name},black.eq.${playerData.name}`)
```

**Updated game display logic**:
- Now uses player names instead of IDs for comparison
- Uses `white_accuracy` and `black_accuracy` instead of `white_acl` and `black_acl`
- Uses `game.date` instead of `game.week_start_date`
- Uses `game.round` instead of `game.tournament_round`
- Added display of `early_late` (tournament session)

### 4. Database Function (`apply_player_history_function_UPDATED.sql`)

**Updated to match actual schema**:
- Uses `games` table (not `game_results`)
- Uses player names (TEXT) instead of UUIDs
- Uses `white_accuracy`/`black_accuracy` columns
- Uses `date` column for grouping
- First looks up player name from UUID, then queries games by name

## Testing Checklist

✅ Build compiles successfully  
✅ No TypeScript errors  
✅ No linting errors  

**To Test**:
1. Apply the updated SQL function: `apply_player_history_function_UPDATED.sql`
2. Click on any player in Your Team or Lineup
3. Verify modal shows:
   - ELO rating
   - Average ACL from `accuracy` column
   - Games played count
4. Click "View Complete Titled Tuesday History"
5. Verify history page shows:
   - Player stats (use `accuracy` field)
   - Recent games list (from `games` table)
   - ACL values in each game
   - Early/Late tournament session

## Important Notes

- The `games` table uses player **names** (TEXT), not UUIDs
- The accuracy column in `chess_players` stores Average Centipawn Loss
- Game results use `white_accuracy` and `black_accuracy`, not `acl`
- The `date` column is TEXT format, cast to DATE when needed
- Weekly performance groups by date (not explicit week_start_date)

