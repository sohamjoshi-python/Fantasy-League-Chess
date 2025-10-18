# 📧 **Resend SMTP Email System - Complete Setup Guide**

## 🎯 **Overview**

Your Fantasy League Chess app now uses **Resend** for all email sending through Supabase Auth. This provides:
- ✅ **Reliable email delivery**
- ✅ **Professional email service**
- ✅ **Easy integration with Supabase**
- ✅ **Cost-effective solution**

## 🔧 **Resend Configuration**

### **SMTP Settings in Supabase:**
Based on [Resend's Supabase integration guide](https://resend.com/docs/send-with-supabase-smtp):

- **Host:** `smtp.resend.com`
- **Port:** `465`
- **Username:** `resend`
- **Password:** `YOUR_API_KEY` (your Resend API key)
- **Security:** SSL/TLS
- **From Email:** `noreply@fantasyleaguechess.com`
- **From Name:** `Fantasy League Chess`

## 📧 **Email Types Available**

### **1. Supabase Auth Emails (via Resend SMTP):**
- ✅ **Email Confirmation** - Sent when user signs up
- ✅ **Password Reset** - Sent when user requests password reset
- ✅ **Magic Link** - Sent for passwordless login
- ✅ **Email Change** - Sent when user changes email

### **2. Custom Emails (via Direct Resend API):**
- ✅ **Welcome Email** - Sent after email confirmation
- ✅ **Weekly Results** - Sent after Titled Tuesday
- ✅ **League Joined** - Sent when joining a league
- ✅ **Custom Emails** - Any custom content

## 🧪 **Testing Email System**

### **Method 1: Test Supabase Auth Emails**
1. **Sign up with a new email** (e.g., `test@example.com`)
2. **Check inbox** for confirmation email (sent via Resend SMTP)
3. **Click confirmation link**
4. **Check inbox** for welcome email (sent via direct Resend API)

### **Method 2: Test Custom Emails**
**Run this in your browser console:**

```javascript
// Test custom email via Resend API
import { sendCustomEmail } from './src/lib/free-email';
await sendCustomEmail(
  'sohampjoshi@outlook.com',
  '🎉 Resend Email Test',
  '<h1>Resend Email Test</h1><p>Testing Resend integration!</p>'
);
```

### **Method 3: Test Welcome Email**
**Run this in your browser console:**

```javascript
// Test welcome email via Resend API
import { sendWelcomeEmail } from './src/lib/free-email';
await sendWelcomeEmail('sohampjoshi@outlook.com');
```

## 🔧 **How It Works**

### **Email Flow:**
1. **User signs up** → Supabase sends confirmation email via Resend SMTP
2. **User clicks confirmation link** → Email gets confirmed
3. **Auth state changes** → Welcome email sent via direct Resend API
4. **User receives emails** → Both confirmation and welcome emails

### **Two Email Systems:**
1. **Supabase Auth Emails** → Use Resend SMTP (configured in Supabase)
2. **Custom Emails** → Use Resend API directly (via Edge Functions)

## 📊 **Cost Analysis**

### **Resend Pricing:**
- **Free Tier:** 3,000 emails/month
- **Pro Plan:** $20/month for 50,000 emails
- **Much cheaper than SendGrid** ($15+/month)

### **Cost Comparison:**
- **Before:** $15+/month with SendGrid
- **After:** $0/month (free tier) or $20/month (pro)
- **Savings:** $15+/month or more

## 🎯 **Expected Results**

### **Confirmation Email (via Resend SMTP):**
- **Subject:** "Confirm your signup"
- **Content:** Supabase default template
- **Delivery:** Reliable via Resend

### **Welcome Email (via Resend API):**
- **Subject:** "Welcome to Fantasy League Chess - Your Fantasy Chess Adventure Begins!"
- **Content:** Beautiful HTML with Fantasy League Chess branding
- **Delivery:** Reliable via Resend

## 🔍 **Troubleshooting**

### **If No Emails Arrive:**
1. **Check Spam/Junk Folder** - Emails might be filtered
2. **Verify Resend API Key** - Check if API key is correct
3. **Check Resend Dashboard** - Look for delivery logs
4. **Verify Domain** - Make sure domain is verified in Resend

### **If Getting Errors:**
1. **API Key Error** - Check Resend API key
2. **Domain Error** - Verify domain in Resend
3. **Rate Limit** - Check Resend usage limits

## 🚀 **Next Steps**

1. **Test signup flow** - Sign up with new email
2. **Check confirmation email** - Should arrive via Resend SMTP
3. **Check welcome email** - Should arrive via Resend API
4. **Monitor Resend dashboard** - Check delivery logs

## 📧 **Resend Dashboard**

**Check your Resend dashboard at:** https://resend.com/emails
- **View delivery logs**
- **Check email status**
- **Monitor usage**
- **Debug issues**

---

**Your email system is now powered by Resend - reliable, professional, and cost-effective!** 🎉

**Total monthly cost: $0 (free tier) or $20 (pro plan)** 💰
