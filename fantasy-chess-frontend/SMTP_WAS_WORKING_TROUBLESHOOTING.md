# 🔍 **SMTP Was Working Before - Troubleshooting Guide**

## 🤔 **Why SMTP Might Stop Working**

### **Common Causes:**

1. **Password Expired/Changed**
   - GoDaddy email passwords sometimes expire
   - Check if password was changed recently

2. **Account Suspended/Locked**
   - Too many failed login attempts
   - Account might be temporarily locked

3. **Supabase Configuration Reset**
   - Supabase settings might have been reset
   - SMTP settings might have been cleared

4. **GoDaddy Server Issues**
   - Temporary server problems
   - Maintenance windows

5. **Rate Limiting**
   - Too many emails sent recently
   - GoDaddy might have rate limited the account

## 🔧 **Quick Troubleshooting Steps**

### **Step 1: Check Supabase SMTP Settings**
1. Go to **Supabase Dashboard → Authentication → Settings → SMTP Settings**
2. **Verify settings are still there:**
   - Host: `smtpout.secureserver.net`
   - Port: `587`
   - Username: `noreply@fantasyleaguechess.com`
   - Password: [check if still correct]

### **Step 2: Test SMTP Connection**
1. In Supabase dashboard, click **"Test SMTP connection"**
2. **Look for specific error messages**
3. **Check if it's a connection issue or authentication issue**

### **Step 3: Check GoDaddy Email Account**
1. **Log into GoDaddy email** directly
2. **Verify password still works**
3. **Check if account is active**
4. **Look for any suspension notices**

### **Step 4: Check Recent Changes**
1. **Did you change the password recently?**
2. **Did you modify any Supabase settings?**
3. **Did you update any GoDaddy settings?**
4. **Any recent deployments or changes?**

## 🧪 **Diagnostic Tests**

### **Test 1: Manual SMTP Test**
Try sending an email manually to verify GoDaddy SMTP works:

```javascript
// Test in browser console
fetch('https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/send-smtp-email-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'sohampjoshi@outlook.com',
    subject: 'SMTP Test',
    htmlContent: '<h1>Testing GoDaddy SMTP</h1>'
  })
}).then(r => r.text()).then(console.log);
```

### **Test 2: Check Supabase Logs**
1. Go to **Supabase Dashboard → Logs → Auth**
2. **Look for recent SMTP errors**
3. **Check for specific error messages**

### **Test 3: Verify GoDaddy Settings**
1. **Log into GoDaddy account**
2. **Check email settings**
3. **Verify SMTP is enabled**
4. **Check for any account issues**

## 🚨 **Common Error Messages & Solutions**

### **"Authentication failed"**
- **Cause:** Wrong password or username
- **Solution:** Reset password in GoDaddy, update Supabase

### **"Connection refused"**
- **Cause:** Wrong host/port or server down
- **Solution:** Verify `smtpout.secureserver.net:587`

### **"Rate limit exceeded"**
- **Cause:** Too many emails sent
- **Solution:** Wait a few hours, check GoDaddy limits

### **"Account suspended"**
- **Cause:** GoDaddy suspended the account
- **Solution:** Contact GoDaddy support

## 🔧 **Quick Fixes to Try**

### **Fix 1: Reset Password**
1. **Go to GoDaddy email settings**
2. **Reset the password**
3. **Update Supabase with new password**
4. **Test connection**

### **Fix 2: Re-enter SMTP Settings**
1. **Clear SMTP settings in Supabase**
2. **Re-enter all settings carefully**
3. **Test connection**

### **Fix 3: Try Different Port**
- **Port 587** (STARTTLS)
- **Port 465** (SSL)
- **Port 25** (if others don't work)

### **Fix 4: Use Different Email Account**
- Try with a different GoDaddy email
- Or use Supabase default email temporarily

## 📞 **If Nothing Works**

1. **Contact GoDaddy Support**
   - Ask about SMTP status
   - Check for account issues
   - Verify server status

2. **Check Supabase Status**
   - Go to Supabase status page
   - Look for any service issues

3. **Temporary Workaround**
   - Disable email confirmation
   - Use Supabase default email
   - Fix SMTP later

## 🎯 **Most Likely Causes**

1. **Password expired/changed** (most common)
2. **Account temporarily locked**
3. **Supabase settings were reset**
4. **GoDaddy server maintenance**

**Start with checking the password and re-entering the SMTP settings in Supabase!** 🔧
