# RLS Policy Type Casting Fix

## Issue
The RLS policies were failing with the error:
```
ERROR: 42883: operator does not exist: uuid = text
HINT: No operator matches the given name and argument types. You might need to add explicit type casts.
```

## Root Cause
The `member_ids` field in the `leagues` table is defined as `UUID[]`, but `auth.uid()` returns a UUID that needs explicit casting when used in array operations.

## Fix Applied
Added explicit type casting `::uuid` to all `auth.uid()` calls in array operations:

### Before:
```sql
WHERE leagues.member_ids @> ARRAY[auth.uid()]
```

### After:
```sql
WHERE leagues.member_ids @> ARRAY[auth.uid()::uuid]
```

## Policies Fixed

1. **trades_select_policy** - SELECT policy for trades table
2. **trades_insert_policy** - INSERT policy for trades table  
3. **trades_update_policy** - UPDATE policy for trades table (2 instances)
4. **trade_notifications_insert_policy** - INSERT policy for trade_notifications table

## Verification
The policies now properly handle UUID array operations without type mismatch errors.

## Files Modified
- `supabase/migrations/20250122000002_create_trading_rls_policies.sql`
