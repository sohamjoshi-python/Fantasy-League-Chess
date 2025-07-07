# League Members Table Implementation

## Overview

This implementation adds a `league_members` table to store user display names for league members, solving the "Unknown Player" issue in the draft UI.

## Problem

The original code tried to fetch user display names from Supabase Auth via the REST API, which returns a 400 Bad Request error because:
- Auth users cannot be queried via the REST API like normal tables
- The `users` table in the public schema doesn't contain Auth user metadata

## Solution

### 1. New Database Table

Created `league_members` table with:
- `league_id`: References the league
- `user_id`: References the user
- `display_name`: User's display name
- `email`: User's email
- `joined_at`: Timestamp when user joined

### 2. Updated Frontend Logic

#### League Creation
- When creating a league, the creator is automatically added to `league_members`
- Display name is extracted from Auth metadata (`display_name` or `full_name`)

#### Joining Leagues
- When joining via code or public leagues, users are added to `league_members`
- Display name is extracted from Auth metadata

#### Draft UI
- `fetchUserMap` now queries `league_members` instead of Auth users
- Fallback to user ID if display name is not available

### 3. Database Functions

- `add_user_to_league()`: Helper function to add users with display names
- `get_league_member_names()`: Helper function to get member display names

## Files Modified

1. **`league_members_migration.sql`** - Database migration
2. **`src/types/index.ts`** - Added `LeagueMember` interface
3. **`src/pages/League.tsx`** - Updated `fetchUserMap` and `addUserToLeague`
4. **`src/pages/JoinLeague.tsx`** - Updated league creation and joining logic

## Migration Steps

1. Run the SQL migration in Supabase SQL Editor
2. Restart your frontend application
3. Test by creating/joining a league and checking the draft UI

## Benefits

- ✅ Solves the "Unknown Player" issue
- ✅ Proper display names in draft UI
- ✅ No more 400 errors from Auth API
- ✅ Maintains data consistency
- ✅ Proper RLS policies for security

## Fallback Behavior

If display name cannot be retrieved from Auth metadata:
- Uses email as display name
- Falls back to first 6 characters of user ID
- Never shows "Unknown Player" again 