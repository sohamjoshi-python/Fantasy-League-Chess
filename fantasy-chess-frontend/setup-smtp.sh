#!/bin/bash

# Direct SMTP Email Setup Script
# This script helps you configure SMTP for the Fantasy League Chess email system

echo "📧 Fantasy League Chess - Direct SMTP Email Setup"
echo "=================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Get project reference
echo "🔗 Please enter your Supabase project reference:"
read -p "Project Ref: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference is required"
    exit 1
fi

echo ""
echo "🔧 Linking to project $PROJECT_REF..."
supabase link --project-ref $PROJECT_REF

echo ""
echo "📋 Choose your SMTP provider:"
echo "1) AWS SES (Recommended - 62,000 free emails/month)"
echo "2) Gmail SMTP (Free with Gmail account)"
echo "3) Mailgun (5,000 free emails/month)"
echo "4) Custom SMTP (Your hosting provider)"
echo ""
read -p "Enter choice (1-4): " CHOICE

case $CHOICE in
    1)
        echo ""
        echo "🔧 AWS SES Configuration"
        echo "======================="
        echo "1. Go to AWS SES Console"
        echo "2. Verify your domain"
        echo "3. Create SMTP credentials"
        echo "4. Use port 2587 (Deno Deploy compatible)"
        echo ""
        read -p "SMTP Hostname (e.g., email-smtp.us-east-1.amazonaws.com): " SMTP_HOSTNAME
        read -p "SMTP Username: " SMTP_USERNAME
        read -s -p "SMTP Password: " SMTP_PASSWORD
        echo ""
        SMTP_PORT="2587"
        ;;
    2)
        echo ""
        echo "🔧 Gmail SMTP Configuration"
        echo "==========================="
        echo "1. Enable 2-factor authentication"
        echo "2. Generate app password"
        echo "3. Use app password (not regular password)"
        echo ""
        read -p "Gmail Address: " SMTP_USERNAME
        read -s -p "App Password: " SMTP_PASSWORD
        echo ""
        SMTP_HOSTNAME="smtp.gmail.com"
        SMTP_PORT="587"
        ;;
    3)
        echo ""
        echo "🔧 Mailgun Configuration"
        echo "========================"
        echo "1. Create Mailgun account"
        echo "2. Add and verify domain"
        echo "3. Get SMTP credentials"
        echo ""
        read -p "SMTP Hostname (e.g., smtp.mailgun.org): " SMTP_HOSTNAME
        read -p "SMTP Username: " SMTP_USERNAME
        read -s -p "SMTP Password: " SMTP_PASSWORD
        echo ""
        SMTP_PORT="587"
        ;;
    4)
        echo ""
        echo "🔧 Custom SMTP Configuration"
        echo "============================"
        read -p "SMTP Hostname: " SMTP_HOSTNAME
        read -p "SMTP Port (use 2587 for Deno Deploy): " SMTP_PORT
        read -p "SMTP Username: " SMTP_USERNAME
        read -s -p "SMTP Password: " SMTP_PASSWORD
        echo ""
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
read -p "From Email Address (e.g., noreply@fantasyleaguechess.com): " SMTP_FROM

# Generate random secret
FUNCTION_SECRET=$(openssl rand -hex 32)

echo ""
echo "🔐 Setting SMTP secrets..."
supabase secrets set \
  SMTP_HOSTNAME="$SMTP_HOSTNAME" \
  SMTP_PORT="$SMTP_PORT" \
  SMTP_USERNAME="$SMTP_USERNAME" \
  SMTP_PASSWORD="$SMTP_PASSWORD" \
  SMTP_FROM="$SMTP_FROM" \
  FUNCTION_SECRET="$FUNCTION_SECRET"

echo ""
echo "✅ SMTP configuration complete!"
echo ""
echo "🧪 Testing the configuration..."
echo "You can now test the email system by running:"
echo "   node test-smtp-email.js"
echo ""
echo "📚 For more details, see: SMTP_EMAIL_SETUP.md"
echo ""
echo "🎉 Your email system is now configured for direct SMTP sending!"
echo "   Total monthly cost: $0"
