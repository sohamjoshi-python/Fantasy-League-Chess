# Row Level Security (RLS) Policies for Trading System

## Overview
This document outlines the RLS policies implemented for the `trades` and `trade_notifications` tables in the Fantasy Chess trading system.

## Security Principles

### 1. **League-Based Access Control**
- Users can only access data for leagues they're members of
- League creators have additional moderation privileges
- All policies check league membership via `leagues.member_ids @> ARRAY[auth.uid()]`

### 2. **Ownership-Based Permissions**
- Users can only modify trades they created (as sellers)
- Users can only view/modify their own notifications
- Ownership is verified through user ID matching

### 3. **Business Logic Enforcement**
- Users can only create trades for players they own
- Users can only accept trades in leagues they belong to
- System functions have appropriate permissions for automated operations

## Trades Table Policies

### SELECT Policy (`trades_select_policy`)
**Purpose:** Allow league members to view all trades in their leagues
```sql
USING (
    league_id IN (
        SELECT leagues.id
        FROM leagues
        WHERE leagues.member_ids @> ARRAY[auth.uid()]
    )
)
```
**Access:** All league members can see all trades in their leagues

### INSERT Policy (`trades_insert_policy`)
**Purpose:** Allow users to create trades for players they own
```sql
WITH CHECK (
    seller_id = auth.uid() AND
    league_id IN (SELECT leagues.id FROM leagues WHERE leagues.member_ids @> ARRAY[auth.uid()]) AND
    EXISTS (SELECT 1 FROM teams WHERE teams.user_id = auth.uid() AND teams.league_id = trades.league_id AND trades.player_id = ANY(teams.player_ids))
)
```
**Access:** Users can create trades only for players they own in leagues they belong to

### UPDATE Policy (`trades_update_policy`)
**Purpose:** Allow sellers to modify trades and buyers to accept trades
```sql
USING (
    seller_id = auth.uid() OR
    (buyer_id = auth.uid() OR (buyer_id IS NULL AND league_id IN (SELECT leagues.id FROM leagues WHERE leagues.member_ids @> ARRAY[auth.uid()])))
)
WITH CHECK (
    (seller_id = auth.uid()) OR
    (buyer_id = auth.uid() AND status = 'accepted' AND league_id IN (SELECT leagues.id FROM leagues WHERE leagues.member_ids @> ARRAY[auth.uid()]))
)
```
**Access:** 
- Sellers can modify their own trades
- Buyers can accept trades (set buyer_id and status to 'accepted')

### DELETE Policy (`trades_delete_policy`)
**Purpose:** Allow users to delete trades they created
```sql
USING (seller_id = auth.uid())
```
**Access:** Only the seller can delete their own trades

## Trade Notifications Table Policies

### SELECT Policy (`trade_notifications_select_policy`)
**Purpose:** Allow users to view their own notifications
```sql
USING (user_id = auth.uid())
```
**Access:** Users can only see their own notifications

### INSERT Policy (`trade_notifications_insert_policy`)
**Purpose:** Allow creation of notifications for league members
```sql
WITH CHECK (
    user_id = auth.uid() OR
    user_id IN (
        SELECT unnest(leagues.member_ids)
        FROM leagues
        WHERE leagues.id IN (SELECT trades.league_id FROM trades WHERE trades.id = trade_notifications.trade_id)
        AND leagues.member_ids @> ARRAY[auth.uid()]
    )
)
```
**Access:** 
- Users can create notifications for themselves
- Users can create notifications for other league members (used by trading functions)

### UPDATE Policy (`trade_notifications_update_policy`)
**Purpose:** Allow users to mark their notifications as seen
```sql
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid())
```
**Access:** Users can only update their own notifications

### DELETE Policy (`trade_notifications_delete_policy`)
**Purpose:** Allow users to delete their own notifications
```sql
USING (user_id = auth.uid())
```
**Access:** Users can only delete their own notifications

## Special Policies

### League Creator Moderation Policies
- **`league_creators_can_view_trades`**: League creators can view all trades in their leagues
- **`league_creators_can_view_notifications`**: League creators can view all notifications in their leagues

These policies allow league creators to moderate trading activity and resolve disputes.

## Function Permissions

All trading functions are granted `EXECUTE` permissions to `authenticated` users:
- `create_trade()`
- `accept_trade()`
- `cancel_trade()`
- `get_user_trades()`
- `get_trade_notifications()`
- `mark_notification_seen()`
- `expire_old_trades()`
- `cleanup_expired_trades()`

## Security Benefits

### 1. **Data Isolation**
- Users can only access data from leagues they belong to
- No cross-league data leakage

### 2. **Ownership Protection**
- Users can only modify trades they created
- Users can only view/modify their own notifications

### 3. **Business Logic Enforcement**
- Users can only trade players they own
- Users can only accept trades in leagues they belong to

### 4. **Moderation Capabilities**
- League creators can monitor all trading activity
- Provides oversight for dispute resolution

### 5. **System Function Support**
- Trading functions can operate within security constraints
- Automated processes (expiration, cleanup) have necessary permissions

## Implementation Notes

1. **Performance**: Policies use efficient array operations (`@>`) for league membership checks
2. **Scalability**: Indexes on `league_id`, `user_id`, and `status` support policy performance
3. **Maintainability**: Clear policy names and comments document the security model
4. **Flexibility**: Policies support both manual and automated trading operations

## Testing Recommendations

1. **Verify league isolation**: Ensure users cannot access trades from other leagues
2. **Test ownership enforcement**: Confirm users cannot modify others' trades
3. **Validate notification privacy**: Ensure users only see their own notifications
4. **Check function permissions**: Verify trading functions work correctly with RLS
5. **Test moderation access**: Confirm league creators can view all data in their leagues
