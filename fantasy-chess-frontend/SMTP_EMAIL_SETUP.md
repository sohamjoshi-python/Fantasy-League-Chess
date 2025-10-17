# 📧 Direct SMTP Email System Setup Guide

This guide shows you how to set up **completely free email sending** using **direct SMTP** (no third-party providers) with Supabase Edge Functions, following the approach from the [Supabase Partner Gallery Example](https://github.com/supabase-community/partner-gallery-example).

## 🎯 **What We've Built**

✅ **Direct SMTP Edge Function** (`send-smtp-email`)  
✅ **No Third-Party Dependencies** (uses your own SMTP server)  
✅ **Completely Free** (only uses your existing SMTP)  
✅ **Database Tracking** (stores email records)  
✅ **Same Interface** (drop-in replacement)

## 🚀 **Free SMTP Providers**

### **1. AWS SES (Recommended)**
- **Cost**: $0 for up to 62,000 emails/month
- **Port**: 2587 (Deno Deploy compatible)
- **Setup**: AWS account + verified domain

### **2. Gmail SMTP**
- **Cost**: $0 (with Gmail account)
- **Port**: 587
- **Setup**: App password required

### **3. Your Hosting Provider**
- **Cost**: Usually included with hosting
- **Port**: 587 or 465
- **Setup**: Use your hosting provider's SMTP

### **4. Mailgun (Free Tier)**
- **Cost**: $0 for up to 5,000 emails/month
- **Port**: 587
- **Setup**: Account + verified domain

## ⚙️ **Setup Instructions**

### **Step 1: Deploy the SMTP Edge Function**

```bash
# Navigate to your project
cd fantasy-chess-frontend

# Deploy the new SMTP email function
npx supabase functions deploy send-smtp-email
```

### **Step 2: Set SMTP Environment Variables**

Add these to your Supabase project secrets:

```bash
# Link to your project
npx supabase link --project-ref your-project-ref

# Set SMTP configuration (choose one provider below)
```

#### **Option A: AWS SES (Recommended)**
```bash
npx supabase secrets set \
  SMTP_HOSTNAME="email-smtp.us-east-1.amazonaws.com" \
  SMTP_PORT="2587" \
  SMTP_USERNAME="your-ses-smtp-username" \
  SMTP_PASSWORD="your-ses-smtp-password" \
  SMTP_FROM="noreply@fantasyleaguechess.com" \
  FUNCTION_SECRET="your-random-secret-key"
```

#### **Option B: Gmail SMTP**
```bash
npx supabase secrets set \
  SMTP_HOSTNAME="smtp.gmail.com" \
  SMTP_PORT="587" \
  SMTP_USERNAME="your-gmail@gmail.com" \
  SMTP_PASSWORD="your-app-password" \
  SMTP_FROM="noreply@fantasyleaguechess.com" \
  FUNCTION_SECRET="your-random-secret-key"
```

#### **Option C: Mailgun (Free Tier)**
```bash
npx supabase secrets set \
  SMTP_HOSTNAME="smtp.mailgun.org" \
  SMTP_PORT="587" \
  SMTP_USERNAME="postmaster@your-domain.mailgun.org" \
  SMTP_PASSWORD="your-mailgun-password" \
  SMTP_FROM="noreply@fantasyleaguechess.com" \
  FUNCTION_SECRET="your-random-secret-key"
```

### **Step 3: Update Client Code**

Update your client code to use the new SMTP function:

```typescript
// Update src/lib/free-email.ts
const response = await fetch('https://your-project.supabase.co/functions/v1/send-smtp-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    to: emailData.to,
    subject: emailData.subject,
    htmlContent: emailData.htmlContent,
    textContent: emailData.textContent,
    emailType: emailData.emailType || 'custom',
    userEmail: emailData.userEmail,
  }),
});
```

### **Step 4: Test the System**

```typescript
import { sendWelcomeEmail, sendCustomEmail } from './src/lib/free-email';

// Test welcome email
await sendWelcomeEmail('test@example.com');

// Test custom email
await sendCustomEmail(
  'test@example.com',
  'Test Subject - Direct SMTP',
  '<h1>Hello World!</h1><p>This email was sent via direct SMTP!</p>'
);
```

## 🔧 **SMTP Provider Setup Guides**

### **AWS SES Setup**

1. **Create AWS Account** (if you don't have one)
2. **Verify Domain** in SES console
3. **Create SMTP Credentials**:
   - Go to SES → SMTP Settings
   - Click "Create My SMTP Credentials"
   - Save username and password
4. **Use Port 2587** (Deno Deploy compatible)

### **Gmail SMTP Setup**

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use App Password** (not your regular password)

### **Mailgun Setup**

1. **Create Mailgun Account**
2. **Add Domain** and verify DNS records
3. **Get SMTP Credentials** from Domain settings
4. **Use Port 587**

## 📊 **Cost Comparison**

| Provider | Monthly Cost | Free Tier | Setup Difficulty |
|----------|-------------|-----------|------------------|
| **AWS SES** | $0 | 62,000 emails | Medium |
| **Gmail SMTP** | $0 | Unlimited* | Easy |
| **Mailgun** | $0 | 5,000 emails | Easy |
| **Hosting SMTP** | $0 | Usually unlimited | Easy |

*Gmail has daily limits but no monthly cost

## 🎯 **Benefits of Direct SMTP**

✅ **$0 Monthly Cost** - Completely free  
✅ **No Third-Party Dependencies** - Uses your own SMTP  
✅ **Full Control** - You own the email infrastructure  
✅ **Better Deliverability** - Direct SMTP connection  
✅ **No Rate Limits** - Beyond your SMTP provider's limits  
✅ **Same Interface** - Drop-in replacement  

## 🚨 **Important Notes**

### **Deno Deploy Limitations:**
- **Port Restrictions**: Cannot use ports 25, 465, 587
- **Recommended Ports**: 2587 (AWS SES), 2525 (alternative)
- **Workaround**: Use AWS SES port 2587 or similar

### **SMTP Authentication:**
- **Base64 Encoding**: Username/password are base64 encoded
- **TLS Required**: Most providers require TLS
- **App Passwords**: Gmail requires app passwords (not regular password)

### **Email Deliverability:**
- **Domain Verification**: Verify your sending domain
- **SPF/DKIM Records**: Set up proper DNS records
- **Warm-up**: Start with low volume to build reputation

## 🧪 **Testing**

### **Test SMTP Connection:**
```bash
# Test the function directly
curl -X POST https://your-project.supabase.co/functions/v1/send-smtp-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"SMTP Test","htmlContent":"<h1>SMTP Test</h1>"}'
```

### **Check Function Logs:**
```bash
npx supabase functions logs send-smtp-email
```

## 🔄 **Migration from Third-Party**

If you're migrating from SendGrid or other providers:

1. **Deploy new function**: `send-smtp-email`
2. **Set SMTP secrets**: Configure your SMTP provider
3. **Update client code**: Point to new function
4. **Test thoroughly**: Verify all email types work
5. **Remove old function**: Delete `send-enhanced-email`

## 🎉 **You're Done!**

Your email system now uses **direct SMTP** with **zero third-party dependencies**! The system will:

- ✅ Send emails via your own SMTP server
- ✅ Track all emails in the database
- ✅ Handle welcome and weekly results emails
- ✅ Fallback to logging if SMTP not configured
- ✅ Cost $0/month (only your SMTP provider's free tier)

**Total Monthly Cost: $0** 🎯

## 📚 **References**

- [Supabase Partner Gallery Example](https://github.com/supabase-community/partner-gallery-example)
- [AWS SES SMTP Setup](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Mailgun SMTP Documentation](https://documentation.mailgun.com/en/latest/quickstart-sending.html)
