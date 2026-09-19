-- Simplified RLS Policies for Trading System (Part 1)
-- Apply this first, then wait a few minutes before applying Part 2

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

-- Step 3: Create basic RLS policies for trades table

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

-- INSERT policy: Users can create trades for players they own
CREATE POLICY "trades_insert_policy" ON trades
    FOR INSERT
    TO authenticated
    WITH CHECK (
        seller_id = auth.uid() AND
        league_id IN (
            SELECT leagues.id
            FROM leagues
            WHERE leagues.member_ids @> ARRAY[auth.uid()::uuid]
        )
    );

-- DELETE policy: Users can delete trades they created
CREATE POLICY "trades_delete_policy" ON trades
    FOR DELETE
    TO authenticated
    USING (seller_id = auth.uid());
