# Player URL Routing Update

## Changes Made

### 1. URL Structure
**Old**: `/player/{uuid}`  
**New**: `/player/{playerName}` (URL-friendly, lowercase, no spaces)

**Examples**:
- Magnus Carlsen → `/player/magnuscarlsen`
- Hikaru Nakamura → `/player/hikarunakamura`
- Ding Liren → `/player/dingliren`

### 2. Route Configuration (`src/App.tsx`)
```typescript
<Route path="/player/:playerName" element={<ProtectedRoute><PlayerHistory /></ProtectedRoute>} />
```
- Placed at the end to avoid conflicts with other routes
- Uses `:playerName` parameter instead of `:playerId`

### 3. PlayerDetailModal (`src/components/PlayerDetailModal.tsx`)
```typescript
const handleViewHistory = () => {
  // Create URL-friendly player name (lowercase, no spaces)
  const urlName = player.name.toLowerCase().replace(/\s+/g, '')
  navigate(`/player/${urlName}`)
  onClose()
}
```
- Converts player name to URL-friendly format
- Removes spaces, converts to lowercase

### 4. PlayerHistory Page (`src/pages/PlayerHistory.tsx`)

**Parameter Extraction**:
```typescript
const { playerName } = useParams<{ playerName: string }>()
```

**Player Lookup**:
```typescript
// Fetch all players
const { data: allPlayers } = await supabase
  .from('chess_players')
  .select('*')

// Find player by matching URL-friendly name
const playerData = allPlayers?.find(p => 
  p.name.toLowerCase().replace(/\s+/g, '') === playerName?.toLowerCase()
)
```

**Debug Logging Added**:
- Logs player name being loaded
- Logs weekly performance data (or errors)
- Logs games loaded count (or errors)
- Helps debug why weekly performance might not be loading

## Debug Console Logs

When you visit a player page, you should see:
1. `Loading player data for: {playerName}`
2. `Found player: {actual player name}`
3. `Loading weekly performance for player ID: {uuid}`
4. Either:
   - `Weekly performance data: [...]` (if successful)
   - `Error loading weekly performance: {...}` (if failed)
5. `Loading games for player name: {player name}`
6. `Loaded games: {count}` (if successful)

## Testing the Weekly Performance Issue

If weekly performance is still not loading, check console for:

1. **Function doesn't exist**:
   ```
   Error loading weekly performance: {code: '42883', message: 'function get_player_weekly_performance(uuid) does not exist'}
   ```
   → Need to apply `apply_player_history_function_UPDATED.sql`

2. **Function returns no data**:
   ```
   Weekly performance data: []
   ```
   → No games in database for this player, or date format issue

3. **Other errors**:
   → Check the error message for specific issue

## Benefits of URL-Friendly Names

✅ **SEO-friendly**: `/player/magnuscarlsen` is more readable than `/player/uuid`  
✅ **Shareable**: Easy to share and remember URLs  
✅ **Human-readable**: URLs make sense to users  
✅ **No collisions**: Player names are unique in the database

## Important Notes

- Player names in the database must be unique (they are)
- URL matching is case-insensitive
- Spaces are removed from URLs
- The actual database query still uses the full player name with spaces

