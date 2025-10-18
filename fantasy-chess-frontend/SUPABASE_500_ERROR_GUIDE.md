# 🔧 **Supabase 500 Error - Troubleshooting Guide**

## 🚨 **The Problem**
You're getting a 500 error during signup:
```
wdbwzvnkfbyzazodfhsw.supabase.co/auth/v1/signup:1 Failed to load resource: the server responded with a status of 500 ()
Error sending confirmation email
```

## 🔍 **Possible Causes & Solutions**

### **1. Supabase Project Settings**
The 500 error could be due to Supabase project configuration issues:

**Check in Supabase Dashboard:**
1. **Go to Authentication → Settings**
2. **Verify Email Settings:**
   - ✅ Email confirmation is enabled
   - ✅ SMTP settings are configured
   - ✅ Email templates are set up
3. **Check Site URL:**
   - Should include `http://localhost:5173` for development
   - Should include `https://fantasyleaguechess.com` for production

### **2. Email Configuration Issues**
The error mentions "Error sending confirmation email" - this suggests SMTP issues:

**Check Supabase SMTP Settings:**
1. **Go to Authentication → Settings → SMTP Settings**
2. **Verify SMTP Configuration:**
   - Host: `email-smtp.us-east-1.amazonaws.com`
   - Port: `587` or `465`
   - Username: Your AWS SES username
   - Password: Your AWS SES password
3. **Test SMTP Connection** in Supabase dashboard

### **3. AWS SES Configuration**
If using AWS SES for emails:

**Check AWS SES:**
1. **Verify Domain/Email** in AWS SES console
2. **Check Sending Limits** - might be in sandbox mode
3. **Verify IAM Permissions** for SMTP access
4. **Check Bounce/Complaint Rates**

### **4. Rate Limiting**
Supabase might be rate limiting signup attempts:

**Solutions:**
- Wait a few minutes before trying again
- Use a different email address
- Check Supabase usage limits

## 🧪 **How to Debug**

### **Method 1: Run Diagnostics**
1. **Go to Fantasy League Chess website**
2. **Open browser console** (F12)
3. **Run this code:**

```javascript
// Test Supabase connection
runDiagnostics()
```

### **Method 2: Check Supabase Logs**
1. **Go to Supabase Dashboard**
2. **Navigate to Logs → Auth**
3. **Look for error messages** around the time of signup attempt

### **Method 3: Test with Different Email**
Try signing up with a different email address to see if it's email-specific.

## 🔧 **Quick Fixes to Try**

### **Fix 1: Update Supabase Settings**
1. **Go to Supabase Dashboard → Authentication → Settings**
2. **Add to Site URL:** `http://localhost:5173,https://fantasyleaguechess.com`
3. **Save changes**

### **Fix 2: Disable Email Confirmation Temporarily**
1. **Go to Authentication → Settings**
2. **Disable "Enable email confirmations"**
3. **Test signup**
4. **Re-enable after testing**

### **Fix 3: Use Supabase Default Email**
1. **Go to Authentication → Settings**
2. **Disable custom SMTP**
3. **Use Supabase default email service**
4. **Test signup**

## 📧 **Expected Behavior**

**When Working Correctly:**
1. **User submits signup form**
2. **Supabase creates user account**
3. **Confirmation email sent** (if enabled)
4. **User inserted into users table**
5. **Welcome email sent** after confirmation

**Current Issue:**
- Step 3 is failing with 500 error
- This prevents the entire signup process

## 🎯 **Next Steps**

1. **Run the diagnostics** to identify the specific issue
2. **Check Supabase dashboard** for configuration problems
3. **Verify SMTP settings** if using custom email
4. **Test with different email** to rule out email-specific issues
5. **Check Supabase logs** for detailed error information

## 🚀 **Quick Test**

Try this simple test in your browser console:

```javascript
// Simple signup test
supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
}).then(result => {
  console.log('Signup result:', result);
}).catch(error => {
  console.log('Signup error:', error);
});
```

---

**The 500 error is likely a Supabase configuration issue, not a code problem. Check your Supabase project settings!** 🔧
