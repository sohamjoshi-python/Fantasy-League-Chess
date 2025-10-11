# Supabase Email Template Setup for Password Reset

## 📧 Configure Password Reset Email Template

### **Step 1: Go to Supabase Dashboard**

1. Open your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Find **"Reset Password"** template

### **Step 2: Update the Email Template**

Replace the default template with this correct one:

```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>You requested to reset your password for your Fantasy Chess account.</p>

<p>Click the button below to reset your password. This link will expire in 1 hour.</p>

<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>

<p>If the button doesn't work, copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>If you didn't request this password reset, you can safely ignore this email.</p>

<p>Thanks,<br/>
The Fantasy Chess Team</p>
```

### **Why `{{ .ConfirmationURL }}` is Important:**

This is **Supabase's template variable** that generates the proper password reset link with:
- ✅ Recovery token
- ✅ Correct redirect URL
- ✅ Proper authentication flow
- ✅ Expiration timestamp

### **Complete Email Template (Styled):**

For a better-looking email, use this styled version:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">Reset Your Password</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi there,
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You requested to reset your password for your <strong>Fantasy Chess</strong> account.
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Click the button below to reset your password. <strong>This link will expire in 1 hour.</strong>
              </p>
              
              <!-- Reset Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0;">
                    <a href="{{ .ConfirmationURL }}" 
                       style="display: inline-block; padding: 16px 40px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Link Fallback -->
              <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 0 0 30px 0;">
                <p style="color: #475569; font-size: 14px; margin: 0 0 10px 0;">
                  <strong>Button not working?</strong> Copy and paste this link into your browser:
                </p>
                <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 0;">
                  {{ .ConfirmationURL }}
                </p>
              </div>
              
              <!-- Security Notice -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 0 0 30px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  ⚠️ <strong>Didn't request this?</strong> You can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                Thanks,<br/>
                <strong>The Fantasy Chess Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                This email was sent because you requested a password reset for your Fantasy Chess account.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
                © 2025 Fantasy Chess. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### **Step 3: Configure Redirect URL**

In the same Supabase dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add your redirect URLs to the **Redirect URLs** allowlist:

**For Development:**
```
http://localhost:5173/reset-password
http://localhost:3000/reset-password
```

**For Production:**
```
https://fantasyleaguechess.com/reset-password
https://www.fantasyleaguechess.com/reset-password
```

### **Step 4: Test the Email**

1. Request a password reset from your app
2. Check your email inbox
3. Verify the email:
   - ✅ Has the "Reset Password" button
   - ✅ Button links to correct URL with token
   - ✅ Backup link is visible
   - ✅ Clear expiration warning (1 hour)

### **Important Template Variables:**

Supabase provides these variables for email templates:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | Full password reset URL with token | `http://localhost:5173/reset-password#access_token=...` |
| `{{ .Token }}` | Just the token (not usually needed) | `abc123...` |
| `{{ .TokenHash }}` | Hashed token (not usually needed) | `hash123...` |
| `{{ .SiteURL }}` | Your site URL from Supabase config | `http://localhost:5173` |

**Always use `{{ .ConfirmationURL }}`** for password reset links!

### **Common Mistakes to Avoid:**

❌ **DON'T DO THIS:**
```html
<!-- Wrong - missing token -->
<a href="http://localhost:5173/reset-password">Reset</a>

<!-- Wrong - manual token construction -->
<a href="{{ .SiteURL }}/reset-password?token={{ .Token }}">Reset</a>
```

✅ **DO THIS:**
```html
<!-- Correct - uses Supabase's full URL with token -->
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

### **Testing Checklist:**

After configuring the email template:

- [ ] Request password reset from your app
- [ ] Receive email within a few minutes
- [ ] Email has correct branding and styling
- [ ] "Reset Password" button is visible and clickable
- [ ] Button links to `/reset-password` page
- [ ] URL includes `#access_token=...` parameter
- [ ] Reset password page loads correctly
- [ ] Can set new password successfully
- [ ] Redirected to sign-in page after reset
- [ ] Can sign in with new password

### **Email Provider Configuration:**

For production, you'll need a proper email service:

**Option 1: SendGrid (Recommended)**
1. Go to Supabase **Settings** → **Auth** → **SMTP Settings**
2. Configure SendGrid SMTP:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: `[Your SendGrid API Key]`

**Option 2: AWS SES**
1. Set up AWS SES in your AWS account
2. Verify your domain
3. Configure SMTP settings in Supabase

**Option 3: Mailgun, Postmark, etc.**
- Similar SMTP configuration
- Follow provider's SMTP documentation

### **Development vs Production:**

**Development (Default Supabase Emails):**
- ✅ Works out of the box
- ⚠️ May go to spam
- ⚠️ Rate limited
- ⚠️ May have delays

**Production (Custom SMTP):**
- ✅ Professional sender address
- ✅ Better deliverability
- ✅ Higher rate limits
- ✅ Branded emails
- ✅ Custom domain

### **Troubleshooting:**

**Email Not Received:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check Supabase logs (Authentication → Logs)
4. Verify SMTP settings (if using custom email)
5. Check rate limits (free tier has limits)

**Button Not Working:**
1. Verify `{{ .ConfirmationURL }}` is used
2. Check redirect URL is in allowlist
3. Test link in incognito/private window
4. Check browser console for errors

**Link Expires Too Quickly:**
- Default expiration: 1 hour
- Cannot be changed in Supabase currently
- Users must click link within 1 hour

### **Example of What the Link Looks Like:**

When user clicks the email button, the URL will be:
```
http://localhost:5173/reset-password#access_token=eyJhbGc...&type=recovery&expires_at=1234567890
```

Or in production:
```
https://fantasyleaguechess.com/reset-password#access_token=eyJhbGc...&type=recovery&expires_at=1234567890
```

The `#access_token` and `type=recovery` parameters are what our app uses to validate the reset session.

### **Security Notes:**

- ✅ Tokens expire in 1 hour
- ✅ One-time use only
- ✅ Tokens invalidated after password change
- ✅ Rate limited to prevent abuse
- ✅ HTTPS in production for security

---

## **Quick Setup Summary:**

1. ✅ Go to Supabase → Authentication → Email Templates
2. ✅ Select "Reset Password" template
3. ✅ Use `{{ .ConfirmationURL }}` in the email
4. ✅ Add redirect URLs to allowlist
5. ✅ Test the flow end-to-end
6. ✅ Configure custom SMTP for production

**That's it!** The email will now properly send password reset links that work with your app. 🎉

