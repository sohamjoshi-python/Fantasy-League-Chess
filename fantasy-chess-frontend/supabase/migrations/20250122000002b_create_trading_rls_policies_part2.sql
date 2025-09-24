-- Simplified RLS Policies for Trading System (Part 2)
-- Apply this after Part 1 has been successfully applied

-- Step 4: Create UPDATE policy for trades (more complex)
CREATE POLICY "trades_update_policy" ON trades
    FOR UPDATE
    TO authenticated
    USING (
        seller_id = auth.uid() OR
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
        (seller_id = auth.uid()) OR
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

-- Step 5: Create policies for trade_notifications table

-- SELECT policy: Users can view their own notifications
CREATE POLICY "trade_notifications_select_policy" ON trade_notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- INSERT policy: Users can create notifications for league members
CREATE POLICY "trade_notifications_insert_policy" ON trade_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        (
            user_id IN (
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

-- UPDATE policy: Users can update their own notifications
CREATE POLICY "trade_notifications_update_policy" ON trade_notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE policy: Users can delete their own notifications
CREATE POLICY "trade_notifications_delete_policy" ON trade_notifications
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
