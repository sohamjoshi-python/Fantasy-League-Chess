Write-Host "Deploying Standings Bonus System..." -ForegroundColor Green

# Step 1: Deploy the Supabase Edge Function
Write-Host "Step 1: Deploying Supabase Edge Function..." -ForegroundColor Yellow
try {
    $result = npx supabase functions deploy award-standings-bonus
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Edge function deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy edge function" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "❌ Error deploying edge function: $_" -ForegroundColor Red
}

# Step 2: Provide SQL instructions
Write-Host "`nStep 2: SQL Setup Required" -ForegroundColor Yellow
Write-Host "📋 MANUAL STEP REQUIRED:" -ForegroundColor Cyan
Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
Write-Host "3. Copy and paste the contents of 'standings-bonus-system.sql'" -ForegroundColor White
Write-Host "4. Click 'Run' to apply the functions" -ForegroundColor White

# Step 3: Verify deployment
Write-Host "`nStep 3: Verifying Deployment..." -ForegroundColor Yellow
try {
    $functions = npx supabase functions list
    if ($functions -match "award-standings-bonus") {
        Write-Host "✅ Edge function found in list!" -ForegroundColor Green
    } else {
        Write-Host "❌ Edge function not found in list" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error checking functions: $_" -ForegroundColor Red
}

# Step 4: Test the function
Write-Host "`nStep 4: Testing Function..." -ForegroundColor Yellow
Write-Host "📋 To test the function:" -ForegroundColor Cyan
Write-Host "1. Go to Supabase Dashboard → Edge Functions" -ForegroundColor White
Write-Host "2. Find 'award-standings-bonus'" -ForegroundColor White
Write-Host "3. Click 'Invoke' to test manually" -ForegroundColor White
Write-Host "4. Or run this SQL to test: SELECT award_standings_bonus_points();" -ForegroundColor White

# Step 5: GitHub Actions
Write-Host "`nStep 5: GitHub Actions Setup" -ForegroundColor Yellow
Write-Host "✅ GitHub Actions workflow created: .github/workflows/standings-bonus-distribution.yml" -ForegroundColor Green
Write-Host "📅 Will run every Monday at 2:00 AM UTC" -ForegroundColor Cyan
Write-Host "🔧 Can be triggered manually from GitHub Actions tab" -ForegroundColor Cyan

Write-Host "`n🎯 Standings Bonus System Summary:" -ForegroundColor Green
Write-Host "   - 1st Place: 50 bonus points" -ForegroundColor White
Write-Host "   - 2nd Place: 40 bonus points" -ForegroundColor White
Write-Host "   - 3rd Place: 30 bonus points" -ForegroundColor White
Write-Host "   - 4th Place: 20 bonus points" -ForegroundColor White
Write-Host "   - 5th+ Place: 10 bonus points" -ForegroundColor White
Write-Host "   - Only processes completed leagues with processed payouts" -ForegroundColor White
Write-Host "   - Prevents duplicate distributions" -ForegroundColor White

Write-Host "`n📚 For more information, see: COMPLETE_COIN_SYSTEM_README.md" -ForegroundColor Cyan
Write-Host "Deployment process completed!" -ForegroundColor Green 