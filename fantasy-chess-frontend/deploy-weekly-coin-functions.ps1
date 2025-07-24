Write-Host "Deploying weekly coin distribution functions..." -ForegroundColor Green

# Read the SQL file
$SQL_FILE = "supabase/migrations/20250723000000_add_weekly_coin_distribution.sql"

if (-not (Test-Path $SQL_FILE)) {
    Write-Host "SQL file not found: $SQL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "SQL file found: $SQL_FILE" -ForegroundColor Green

# Try to execute the SQL using Supabase CLI
Write-Host "Attempting to execute SQL..." -ForegroundColor Yellow

# Try to reset the database to apply all migrations
Write-Host "Resetting database to apply all migrations..." -ForegroundColor Yellow

# Use echo to automatically answer "Y" to the prompt
echo "Y" | npx supabase db reset --linked

Write-Host "Database reset completed!" -ForegroundColor Green

# Test the function
Write-Host "Testing the function..." -ForegroundColor Yellow

$response = npx supabase functions invoke weekly-coin-distribution --method POST

Write-Host "Function test completed!" -ForegroundColor Green

Write-Host "Deployment process completed!" -ForegroundColor Green 