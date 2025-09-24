-- Check and Create Missing Trading Functions
-- Run this to verify what functions exist and create missing ones

-- Step 1: Check what functions currently exist
SELECT routine_name, routine_type, data_type
FROM information_schema.routines 
WHERE routine_name IN (
    'create_trade', 'accept_trade', 'cancel_trade', 
    'get_user_trades', 'get_trade_notifications', 
    'mark_notification_seen', 'expire_old_trades', 'cleanup_expired_trades'
)
ORDER BY routine_name;

-- Step 2: Check if tables exist
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name IN ('trades', 'trade_notifications')
ORDER BY table_name;

-- If the above queries show missing functions or tables, run the comprehensive fix:
-- Copy and paste the contents of comprehensive_trading_fix.sql into the SQL Editor
