@echo off
echo.
echo ========================================
echo Fantasy Chess - League Members Migration
echo ========================================
echo.
echo This script will help you run the league_members table migration.
echo.
echo Steps:
echo 1. Open your Supabase dashboard
echo 2. Go to the SQL Editor
echo 3. Copy the contents of league_members_migration.sql
echo 4. Paste and run the SQL in Supabase
echo.
echo The migration will:
echo - Create a league_members table
echo - Add proper indexes and RLS policies
echo - Create helper functions
echo.
echo After running the migration, the display names should work properly!
echo.
pause 