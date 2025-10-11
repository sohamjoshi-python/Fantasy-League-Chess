-- Fixed RLS Policies for Trading System
-- This version includes all necessary type casting fixes

-- Step 1: Enable RLS on trading tables
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_notifications ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies (if they exist)
DROP POLICY IF EXISTS "trades_select_policy" ON trades;
DROP POLICY IF EXISTS "trades_insert_policy" ON trades;
DROP POLICY IF EXISTS "trades_update_policy" ON trades;
DROP POLICY IF EXISTS "trades_delete_policy" ON trades;

DROP POLICY IF EXISTS "trade_notifications_select_policy" ON trade_notifications;
DROP POLICY IF EXISTS "trade_notifications_insert_policy" ON trade_notifications;
DROP POLICY IF EXISTS "trade_notifications_update_policy" ON trade_notifications;
DROP POLICY IF EXISTS "trade_notifications_delete_policy" ON trade_notifications;

DROP POLICY IF EXISTS "league_creators_can_view_trades" ON trades;
DROP POLICY IF EXISTS "league_creators_can_view_notifications" ON trade_notifications;

-- Step 3: Create RLS policies for trades table

-- SELECT policy: Users can view trades in leagues they're members of
CREATE POLICY "trades_select_policy" ON trades
    FOR SELECT
    TO authenticated
    USING (
        league_id IN (
            SELECT leagues.id
            FROM leagues
            WHERE leagues.member_ids @> ARRAY[auth.uid()::uuid]
        )
    );

-- INSERT policy: Users can create trades for players they own in leagues they're members of
CREATE POLICY "trades_insert_policy" ON trades
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- User must be the seller
        seller_id = auth.uid() AND
        -- User must be a member of the league
        league_id IN (
            SELECT leagues.id
            FROM leagues
            WHERE leagues.member_ids @> ARRAY[auth.uid()::uuid]
        ) AND
        -- User must own the player in this league
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.user_id = auth.uid()
            AND teams.league_id = trades.league_id
            AND trades.player_id::text = ANY(teams.player_ids::text[])
        )
    );

-- UPDATE policy: Users can update trades they created or accept trades they can buy
CREATE POLICY "trades_update_policy" ON trades
    FOR UPDATE
    TO authenticated
    USING (
        -- User is the seller (can cancel/modify their own trades)
        seller_id = auth.uid() OR
        -- User is a potential buyer in the same league (can accept trades)
        (
            buyer_id = auth.uid() OR
            (
                buyer_id IS NULL AND
                league_id IN (
                    SELECT leagues.id
                    FROM leagues
                    WHERE leagues.member_ids @> ARRAY[auth.uid()::uuid]
                )
            )
        )
    )
    WITH CHECK (
        -- Seller can only modify their own trades
        (seller_id = auth.uid()) OR
        -- Buyer can only accept trades (set buyer_id and status to 'accepted')
        (
            buyer_id = auth.uid() AND
            status = 'accepted' AND
            league_id IN (
                SELECT leagues.id
                FROM leagues
                WHERE leagues.member_ids @> ARRAY[auth.uid()::uuid]
            )
        )
    );

-- DELETE policy: Users can delete trades they created
CREATE POLICY "trades_delete_policy" ON trades
    FOR DELETE
    TO authenticated
    USING (
        seller_id = auth.uid()
    );

-- Step 4: Create RLS policies for trade_notifications table

-- SELECT policy: Users can view their own notifications
CREATE POLICY "trade_notifications_select_policy" ON trade_notifications
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- INSERT policy: Users can create notifications for league members (except seller)
CREATE POLICY "trade_notifications_insert_policy" ON trade_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- User can create notifications for themselves
        user_id = auth.uid() OR
        -- User can create notifications for other league members
        (
            user_id::uuid IN (
                SELECT unnest(leagues.member_ids)
                FROM leagues
                WHERE leagues.id IN (
                    SELECT trades.league_id
                    FROM trades
                    WHERE trades.id = trade_notifications.trade_id
                )
                AND leagues.member_ids @> ARRAY[auth.uid()::uuid]
            )
        )
    );

-- UPDATE policy: Users can update their own notifications (mark as seen)
CREATE POLICY "trade_notifications_update_policy" ON trade_notifications
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- DELETE policy: Users can delete their own notifications
CREATE POLICY "trade_notifications_delete_policy" ON trade_notifications
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- Step 5: Grant necessary permissions for trading functions
GRANT EXECUTE ON FUNCTION create_trade(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_trade(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_trade(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_trades(UUID, UUID) TO authenticated;
zZzzzzGRANT EXECUTE ON FUNCTION get_trade_notifications(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_seen(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_trades() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_trades() TO authenticated;

-- Step 6: Create additional security policies for edge cases

-- Allow league creators to view all trades in their leagues (for moderation)
CREATE POLICY "league_creators_can_view_trades" ON trades
    FOR SELECT
    TO authenticated
    USING (
        league_id IN (
            SELECT leagues.id
            FROM leagues
            WHERE leagues.creator_id = auth.uid()
        )
    );

-- Allow league creators to view all notifications in their leagues (for moderation)
CREATE POLICY "league_creators_can_view_notifications" ON trade_notifications
    FOR SELECT
    TO authenticated
    USING (
        trade_id IN (
            SELECT trades.id
            FROM trades
            JOIN leagues ON trades.league_id = leagues.id
            WHERE leagues.creator_id = auth.uid()
        )
    );
