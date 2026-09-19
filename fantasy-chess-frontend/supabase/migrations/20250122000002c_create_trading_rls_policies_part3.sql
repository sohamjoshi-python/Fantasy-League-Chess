-- Simplified RLS Policies for Trading System (Part 3)
-- Apply this after Part 2 has been successfully applied

-- Step 6: Grant permissions for trading functions
GRANT EXECUTE ON FUNCTION create_trade(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_trade(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_trade(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_trades(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trade_notifications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_seen(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_trades() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_trades() TO authenticated;

-- Step 7: Create moderation policies for league creators

-- Allow league creators to view all trades in their leagues
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

-- Allow league creators to view all notifications in their leagues
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
