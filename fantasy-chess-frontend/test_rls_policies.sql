-- Test RLS Policies
-- Run this after applying the RLS policies to verify they work

-- Test 1: Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('trades', 'trade_notifications');

-- Test 2: Check if policies exist
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename IN ('trades', 'trade_notifications')
ORDER BY tablename, policyname;

-- Test 3: Verify function permissions
SELECT routine_name, routine_type, security_type
FROM information_schema.routines 
WHERE routine_name IN (
    'create_trade', 'accept_trade', 'cancel_trade', 
    'get_user_trades', 'get_trade_notifications', 
    'mark_notification_seen', 'expire_old_trades', 'cleanup_expired_trades'
)
ORDER BY routine_name;
