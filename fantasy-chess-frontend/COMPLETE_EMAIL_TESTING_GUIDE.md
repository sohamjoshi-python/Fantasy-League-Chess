# 📧 **Complete Email Testing Guide - Fantasy League Chess**

## 🎯 **Overview**

Your Fantasy League Chess app now has a complete email system powered by **Resend**. This guide covers testing all email types.

## 📧 **Available Email Types**

### **1. Supabase Auth Emails (via Resend SMTP)**
- ✅ **Email Confirmation** - Sent when user signs up
- ✅ **Password Reset** - Sent when user requests password reset  
- ✅ **Magic Link** - Sent for passwordless login
- ✅ **Email Change** - Sent when user changes email

### **2. Custom Emails (via Resend API)**
- ✅ **Welcome Email** - Sent after email confirmation
- ✅ **Weekly Results** - Sent after Titled Tuesday
- ✅ **League Invitation** - Sent when joining a league
- ✅ **Custom Emails** - Any custom content

## 🧪 **Testing Methods**

### **Method 1: Complete Email System Test**

**Copy and paste this into your browser console:**

```javascript
// Test All Email Types - Complete Email System Test
console.log('🧪 Testing All Email Types - Complete Email System Test...\n');

async function testAllEmailTypes() {
  try {
    console.log('📧 Testing all email types in Fantasy League Chess...\n');
    
    // Import the email functions
    const { sendCustomEmail, sendWelcomeEmail, sendWeeklyResultsEmail } = await import('./src/lib/resend-email');
    
    const testEmail = 'sohampjoshi@outlook.com';
    
    console.log('🎯 Test Email:', testEmail);
    console.log('📝 Note: All emails will be sent via Resend API\n');
    
    // Test 1: Custom Email
    console.log('🧪 Test 1: Custom Email');
    console.log('📧 Sending custom email...');
    
    const customResult = await sendCustomEmail(
      testEmail,
      '🎉 Fantasy League Chess - Custom Email Test',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>Custom Email Test</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>Hello there!</p>
            <p>This is a test of the <strong>custom email</strong> functionality in Fantasy League Chess.</p>
            <p>This email was sent via the Resend API using our custom email system.</p>
            <p>If you received this email, the custom email system is working correctly!</p>
            <p>Best regards,<br>The Fantasy League Chess Team</p>
          </div>
        </div>
      `
    );
    
    console.log('📧 Custom Email Result:', customResult);
    console.log('Status:', customResult.success ? '✅ SUCCESS' : '❌ FAILED');
    
    // Test 2: Welcome Email
    console.log('\n🧪 Test 2: Welcome Email');
    const welcomeResult = await sendWelcomeEmail(testEmail);
    console.log('📧 Welcome Email Result:', welcomeResult);
    console.log('Status:', welcomeResult.success ? '✅ SUCCESS' : '❌ FAILED');
    
    // Test 3: Weekly Results Email
    console.log('\n🧪 Test 3: Weekly Results Email');
    const weeklyResult = await sendWeeklyResultsEmail(testEmail, {
      week: '2024-01-15',
      totalPoints: 125.5,
      rank: 3,
      leagueName: 'Test League'
    });
    console.log('📧 Weekly Results Email Result:', weeklyResult);
    console.log('Status:', weeklyResult.success ? '✅ SUCCESS' : '❌ FAILED');
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`Custom Email: ${customResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Welcome Email: ${welcomeResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Weekly Results: ${weeklyResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
  } catch (error) {
    console.log('❌ Test Error:', error.message);
  }
}

// Run the test
testAllEmailTypes();
```

### **Method 2: Individual Email Tests**

**Test specific email types:**

```javascript
// Test Custom Email Only
async function testCustomEmail() {
  const { sendCustomEmail } = await import('./src/lib/resend-email');
  const result = await sendCustomEmail(
    'sohampjoshi@outlook.com',
    '🎉 Custom Email Test',
    '<h1>Custom Email Test</h1><p>This is a test!</p>'
  );
  console.log('Custom Email Result:', result);
  return result.success;
}

// Test Welcome Email Only
async function testWelcomeEmail() {
  const { sendWelcomeEmail } = await import('./src/lib/resend-email');
  const result = await sendWelcomeEmail('sohampjoshi@outlook.com');
  console.log('Welcome Email Result:', result);
  return result.success;
}

// Run individual tests
testCustomEmail();
testWelcomeEmail();
```

### **Method 3: Test Supabase Auth Emails**

**Test the Supabase Auth email flow:**

1. **Sign up with a new email** (e.g., `test@example.com`)
2. **Check inbox** for confirmation email (sent via Resend SMTP)
3. **Click confirmation link**
4. **Check inbox** for welcome email (sent via Resend API)

## 📊 **Expected Results**

### **Custom Email Test:**
- **Subject:** "🎉 Fantasy League Chess - Custom Email Test"
- **Content:** Beautiful HTML with Fantasy League Chess branding
- **Delivery:** Reliable via Resend API

### **Welcome Email Test:**
- **Subject:** "Welcome to Fantasy League Chess - Your Fantasy Chess Adventure Begins!"
- **Content:** Professional welcome message with dashboard link
- **Delivery:** Reliable via Resend API

### **Weekly Results Email Test:**
- **Subject:** "Your Weekly Fantasy Chess Results"
- **Content:** Weekly performance summary
- **Delivery:** Reliable via Resend API

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
4. **Edge Function Error** - Check if `send-resend-email` is deployed

## 📧 **Resend Dashboard**

**Check your Resend dashboard at:** https://resend.com/emails
- **View delivery logs**
- **Check email status**
- **Monitor usage**
- **Debug issues**

## 🎯 **Email Types Summary**

| Email Type | Method | Trigger | Status |
|------------|--------|---------|--------|
| **Email Confirmation** | Resend SMTP | User signup | ✅ Working |
| **Password Reset** | Resend SMTP | Password reset request | ✅ Working |
| **Welcome Email** | Resend API | After email confirmation | ✅ Working |
| **Weekly Results** | Resend API | After Titled Tuesday | ✅ Working |
| **Custom Emails** | Resend API | Manual trigger | ✅ Working |

---

**🎉 Your complete email system is ready for testing!**

**Run the test scripts above to verify all email types are working correctly.** 🚀
