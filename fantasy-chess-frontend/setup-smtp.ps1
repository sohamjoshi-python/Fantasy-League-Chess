# PowerShell script for Direct SMTP Email Setup
# This script helps you configure SMTP for the Fantasy League Chess email system

Write-Host "📧 Fantasy League Chess - Direct SMTP Email Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $supabaseVersion = npx supabase --version
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Get project reference
Write-Host "🔗 Please enter your Supabase project reference:" -ForegroundColor Yellow
$PROJECT_REF = Read-Host "Project Ref"

if ([string]::IsNullOrEmpty($PROJECT_REF)) {
    Write-Host "❌ Project reference is required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Linking to project $PROJECT_REF..." -ForegroundColor Yellow
npx supabase link --project-ref $PROJECT_REF

Write-Host ""
Write-Host "📋 Choose your SMTP provider:" -ForegroundColor Cyan
Write-Host "1) AWS SES (Recommended - 62,000 free emails/month)" -ForegroundColor White
Write-Host "2) Gmail SMTP (Free with Gmail account)" -ForegroundColor White
Write-Host "3) Mailgun (5,000 free emails/month)" -ForegroundColor White
Write-Host "4) Custom SMTP (Your hosting provider)" -ForegroundColor White
Write-Host ""
$CHOICE = Read-Host "Enter choice (1-4)"

switch ($CHOICE) {
    "1" {
        Write-Host ""
        Write-Host "🔧 AWS SES Configuration" -ForegroundColor Cyan
        Write-Host "=======================" -ForegroundColor Cyan
        Write-Host "1. Go to AWS SES Console" -ForegroundColor White
        Write-Host "2. Verify your domain" -ForegroundColor White
        Write-Host "3. Create SMTP credentials" -ForegroundColor White
        Write-Host "4. Use port 2587 (Deno Deploy compatible)" -ForegroundColor White
        Write-Host ""
        $SMTP_HOSTNAME = Read-Host "SMTP Hostname (e.g., email-smtp.us-east-1.amazonaws.com)"
        $SMTP_USERNAME = Read-Host "SMTP Username"
        $SMTP_PASSWORD = Read-Host "SMTP Password" -AsSecureString
        $SMTP_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SMTP_PASSWORD))
        $SMTP_PORT = "2587"
    }
    "2" {
        Write-Host ""
        Write-Host "🔧 Gmail SMTP Configuration" -ForegroundColor Cyan
        Write-Host "===========================" -ForegroundColor Cyan
        Write-Host "1. Enable 2-factor authentication" -ForegroundColor White
        Write-Host "2. Generate app password" -ForegroundColor White
        Write-Host "3. Use app password (not regular password)" -ForegroundColor White
        Write-Host ""
        $SMTP_USERNAME = Read-Host "Gmail Address"
        $SMTP_PASSWORD = Read-Host "App Password" -AsSecureString
        $SMTP_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SMTP_PASSWORD))
        $SMTP_HOSTNAME = "smtp.gmail.com"
        $SMTP_PORT = "587"
    }
    "3" {
        Write-Host ""
        Write-Host "🔧 Mailgun Configuration" -ForegroundColor Cyan
        Write-Host "========================" -ForegroundColor Cyan
        Write-Host "1. Create Mailgun account" -ForegroundColor White
        Write-Host "2. Add and verify domain" -ForegroundColor White
        Write-Host "3. Get SMTP credentials" -ForegroundColor White
        Write-Host ""
        $SMTP_HOSTNAME = Read-Host "SMTP Hostname (e.g., smtp.mailgun.org)"
        $SMTP_USERNAME = Read-Host "SMTP Username"
        $SMTP_PASSWORD = Read-Host "SMTP Password" -AsSecureString
        $SMTP_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SMTP_PASSWORD))
        $SMTP_PORT = "587"
    }
    "4" {
        Write-Host ""
        Write-Host "🔧 Custom SMTP Configuration" -ForegroundColor Cyan
        Write-Host "============================" -ForegroundColor Cyan
        $SMTP_HOSTNAME = Read-Host "SMTP Hostname"
        $SMTP_PORT = Read-Host "SMTP Port (use 2587 for Deno Deploy)"
        $SMTP_USERNAME = Read-Host "SMTP Username"
        $SMTP_PASSWORD = Read-Host "SMTP Password" -AsSecureString
        $SMTP_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SMTP_PASSWORD))
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
$SMTP_FROM = Read-Host "From Email Address (e.g., noreply@fantasyleaguechess.com)"

# Generate random secret
$FUNCTION_SECRET = -join ((1..32) | ForEach {Get-Random -InputObject @('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f')})

Write-Host ""
Write-Host "🔐 Setting SMTP secrets..." -ForegroundColor Yellow

# Set secrets using PowerShell-compatible syntax
$secretsCommand = "npx supabase secrets set SMTP_HOSTNAME=`"$SMTP_HOSTNAME`" SMTP_PORT=`"$SMTP_PORT`" SMTP_USERNAME=`"$SMTP_USERNAME`" SMTP_PASSWORD=`"$SMTP_PASSWORD_PLAIN`" SMTP_FROM=`"$SMTP_FROM`" FUNCTION_SECRET=`"$FUNCTION_SECRET`""

Invoke-Expression $secretsCommand

Write-Host ""
Write-Host "✅ SMTP configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Testing the configuration..." -ForegroundColor Yellow
Write-Host "You can now test the email system by running:" -ForegroundColor White
Write-Host "   node test-smtp-email.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 For more details, see: SMTP_EMAIL_SETUP.md" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your email system is now configured for direct SMTP sending!" -ForegroundColor Green
Write-Host "   Total monthly cost: `$0" -ForegroundColor Green
