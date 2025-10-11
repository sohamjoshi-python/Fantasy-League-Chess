# Password Reset - Complete Guide

## ✅ Fixed Issues

### 1. **OTP Expired Error Handling**
When users click an expired password reset link, they now see:
- Clear error message explaining the link has expired
- Instructions on how to request a new link
- Automatic redirect option back to sign-in page

### 2. **Dynamic Redirect URLs (Development & Production)**
The app now automatically uses the correct URL based on environment:
- **Development** (localhost): `http://localhost:5173/reset-password`
- **Production** (fantasyleaguechess.com): `https://fantasyleaguechess.com/reset-password`

No manual configuration needed when deploying!

## 🔄 How It Works

### **Password Reset Flow:**

1. **User Requests Reset**
   - Goes to `/signin`
   - Clicks "Forgot Password?"
   - Enters email address
   - System detects environment and sends appropriate reset link

2. **Email Sent**
   - Link expires in 1 hour
   - Contains token for authentication
   - Redirects to `/reset-password` page

3. **User Clicks Link**
   - **If Valid**: Opens reset password page
   - **If Expired**: Shows error with instructions to request new link

4. **User Sets New Password**
   - Enters new password
   - Confirms password
   - Password updated successfully
   - Redirected to sign-in page

5. **User Signs In**
   - Uses new password to sign in
   - Success!

## 🛡️ Error Handling

### **Expired Link Handling**

**On Sign-In Page:**
- Detects error hash in URL: `#error=access_denied&error_code=otp_expired`
- Displays friendly error message
- Provides guidance to request new link
- Clears error from URL for clean state

**On Reset Password Page:**
- Checks for error in URL hash
- Validates session
- Shows clear instructions if expired
- Provides button to return to sign-in

### **Error Messages:**

**Expired Link:**
```
"Email link is invalid or has expired"

Your password reset link has expired. Please request a new one using 
the "Forgot Password?" link below.
```

**Invalid Link:**
```
"Invalid or expired reset link. Please request a new password reset."

To reset your password:
1. Return to the Sign In page
2. Click "Forgot Password?"
3. Request a new reset link
4. Click the link in your email within 1 hour
```

## 🌐 Environment Detection

### **Automatic URL Selection:**

```typescript
const isProduction = window.location.hostname === 'fantasyleaguechess.com' || 
                    window.location.hostname === 'www.fantasyleaguechess.com'
                    
const redirectUrl = isProduction 
  ? 'https://fantasyleaguechess.com/reset-password'
  : `${window.location.origin}/reset-password`
```

### **Supported Environments:**

| Environment | Hostname | Redirect URL |
|------------|----------|--------------|
| Development | localhost:5173 | http://localhost:5173/reset-password |
| Development | localhost:3000 | http://localhost:3000/reset-password |
| Production | fantasyleaguechess.com | https://fantasyleaguechess.com/reset-password |
| Production | www.fantasyleaguechess.com | https://fantasyleaguechess.com/reset-password |

## 📋 Supabase Configuration

### **Required Settings:**

1. **Go to Supabase Dashboard** → Authentication → URL Configuration

2. **Add Redirect URLs:**
   ```
   http://localhost:5173/reset-password
   https://fantasyleaguechess.com/reset-password
   ```

3. **Email Template Settings:**
   - Go to Authentication → Email Templates
   - Select "Reset Password" template
   - Ensure it's enabled
   - Verify the redirect URL is set correctly

### **Email Service Configuration:**

For production, configure a proper email service:
- Go to Settings → Auth
- Configure SMTP or use service like SendGrid, AWS SES
- Test email delivery

## 🧪 Testing

### **Test Password Reset Flow:**

**Development:**
1. Run `npm run dev`
2. Go to http://localhost:5173/signin
3. Click "Forgot Password?"
4. Enter your test email
5. Check email for reset link
6. Click link (should open http://localhost:5173/reset-password)
7. Set new password
8. Sign in with new password

**Production:**
1. Go to https://fantasyleaguechess.com/signin
2. Follow same steps
3. Link should open https://fantasyleaguechess.com/reset-password

### **Test Expired Link:**

1. Request password reset
2. Wait more than 1 hour
3. Click the link
4. Should see expired error message
5. Follow instructions to request new link

## 📱 User Experience

### **Clear Communication:**

**Success Messages:**
- ✅ "Check Your Email" - clear instructions
- ✅ Warning about 1-hour expiration
- ✅ Reminder to check spam folder

**Error Messages:**
- ❌ Clear explanation of what went wrong
- 🔄 Step-by-step instructions to recover
- 🔗 Easy navigation back to sign-in

**Visual Indicators:**
- 📧 Mail icon for email sent
- ✅ Check icon for success
- ⚠️ Alert icon for errors
- ⏱️ Clock icon for expiration warning

## 🔐 Security Features

1. **Time-Limited Links**
   - Reset links expire in 1 hour
   - Prevents unauthorized access to old links

2. **Session Validation**
   - Reset page validates session before allowing password change
   - Invalid sessions are rejected immediately

3. **Password Requirements**
   - Minimum 6 characters
   - Confirmation required
   - Cannot submit without matching passwords

4. **Clean URL Handling**
   - Error parameters cleared from URL after processing
   - No sensitive information left in browser history

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Configure Supabase redirect URLs for production domain
- [ ] Set up proper email service (SendGrid, AWS SES, etc.)
- [ ] Test password reset flow in production
- [ ] Verify email delivery works
- [ ] Test expired link handling
- [ ] Confirm redirect URLs are correct

## 📝 Files Modified

1. **src/pages/SignIn.tsx**
   - Added URL hash error detection
   - Implemented dynamic redirect URLs
   - Enhanced error messaging
   - Added expiration warnings

2. **src/pages/ResetPassword.tsx**
   - Added URL hash error detection
   - Improved expired link error page
   - Added step-by-step recovery instructions

## 💡 Tips for Users

**In the "Check Your Email" message, users are informed:**
- ⏱️ Link expires in 1 hour
- 💡 Check spam folder
- 🔄 Can request new link if needed
- 📧 Clear instructions on what to do

**If link expires, users see:**
- Clear explanation that link expired
- Step-by-step guide to request new link
- Large button to return to sign-in
- No confusion or dead ends

## 🎯 Success Metrics

All password reset flows now handle:
- ✅ Valid links → Set new password
- ✅ Expired links → Clear error and recovery path
- ✅ Invalid links → Clear error and recovery path
- ✅ Development environment → localhost URLs
- ✅ Production environment → fantasyleaguechess.com URLs
- ✅ Email delivery → Clear instructions and warnings
- ✅ User guidance → No dead ends or confusion

