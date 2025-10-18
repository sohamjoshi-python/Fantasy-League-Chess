# 📧 **Complete Email Testing Guide**

## 🎯 **Email Types Available**

Your Fantasy League Chess app has several email types that can be tested:

1. **Welcome Email** - Sent after signup
2. **Weekly Results Email** - Sent after Titled Tuesday
3. **Custom Emails** - For any purpose
4. **League Joined Email** - When joining a league
5. **Password Reset Email** - For password recovery

## 🧪 **How to Test Each Email Type**

### **Method 1: Browser Console Testing**

**Go to your Fantasy League Chess website, open browser console (F12), and run these commands:**

#### **1. Test Welcome Email**
```javascript
// Test welcome email
import { sendWelcomeEmail } from './src/lib/free-email';
await sendWelcomeEmail('sohampjoshi@outlook.com');
```

#### **2. Test Custom Email**
```javascript
// Test custom email with HTML content
import { sendCustomEmail } from './src/lib/free-email';
await sendCustomEmail(
  'sohampjoshi@outlook.com',
  '🎉 Test Email - Fantasy League Chess',
  `
    <h1>🎉 Custom Email Test</h1>
    <p>Hello Soham!</p>
    <p>This is a test of the custom email system.</p>
    
    <h2>✅ What's Working:</h2>
    <ul>
      <li><strong>Direct SMTP Connection</strong></li>
      <li><strong>HTML Email Support</strong></li>
      <li><strong>Custom Content</strong></li>
      <li><strong>$0/month Cost</strong></li>
    </ul>
    
    <p>This email proves your custom email system is working!</p>
  `
);
```

#### **3. Test Weekly Results Email**
```javascript
// Test weekly results email
import { sendWeeklyResultsEmail } from './src/lib/free-email';
await sendWeeklyResultsEmail('sohampjoshi@outlook.com', {
  week: '2024-01-15',
  totalPoints: 1250,
  leagues: [
    { name: 'Test League', points: 1250, rank: 1 }
  ]
});
```

### **Method 2: Direct Function Testing**

**Create a test file and run it:**

```javascript
// test-all-emails.js
import { sendWelcomeEmail, sendCustomEmail, sendWeeklyResultsEmail } from './src/lib/free-email';

async function testAllEmails() {
  const testEmail = 'sohampjoshi@outlook.com';
  
  console.log('🧪 Testing all email types...\n');
  
  // Test 1: Welcome Email
  console.log('1. Testing Welcome Email...');
  try {
    const result1 = await sendWelcomeEmail(testEmail);
    console.log('✅ Welcome Email:', result1.success ? 'Sent' : 'Failed');
  } catch (error) {
    console.log('❌ Welcome Email Error:', error.message);
  }
  
  // Test 2: Custom Email
  console.log('2. Testing Custom Email...');
  try {
    const result2 = await sendCustomEmail(
      testEmail,
      '🧪 Custom Email Test',
      '<h1>Custom Email Test</h1><p>This is a test email!</p>'
    );
    console.log('✅ Custom Email:', result2.success ? 'Sent' : 'Failed');
  } catch (error) {
    console.log('❌ Custom Email Error:', error.message);
  }
  
  // Test 3: Weekly Results Email
  console.log('3. Testing Weekly Results Email...');
  try {
    const result3 = await sendWeeklyResultsEmail(testEmail, {
      week: '2024-01-15',
      totalPoints: 1250,
      leagues: [{ name: 'Test League', points: 1250, rank: 1 }]
    });
    console.log('✅ Weekly Results Email:', result3.success ? 'Sent' : 'Failed');
  } catch (error) {
    console.log('❌ Weekly Results Email Error:', error.message);
  }
  
  console.log('\n🎉 Email testing complete!');
  console.log('📬 Check your Outlook inbox for all test emails!');
}

// Run the test
testAllEmails();
```

### **Method 3: App-Based Testing**

#### **Test Welcome Email:**
1. **Sign up with a new email** (e.g., `test@example.com`)
2. **Check console logs** for welcome email sending
3. **Check inbox** for welcome email

#### **Test Weekly Results Email:**
1. **Join a league** and create a lineup
2. **Wait for Titled Tuesday** (or trigger manually)
3. **Check inbox** for weekly results email

#### **Test League Joined Email:**
1. **Join a league** using a join code
2. **Check inbox** for league joined email

## 🔧 **Troubleshooting Email Issues**

### **If No Emails Arrive:**

1. **Check Spam/Junk Folder** - Outlook sometimes filters new senders
2. **Check Console Logs** - Look for error messages
3. **Verify SMTP Configuration** - Check Supabase SMTP settings
4. **Test SMTP Connection** - Use Supabase dashboard

### **If Getting Errors:**

1. **Authentication Error** - Make sure you're logged in
2. **SMTP Connection Error** - Check SMTP settings
3. **Rate Limiting** - Wait a few minutes between tests

## 📊 **Expected Email Results**

### **Welcome Email:**
- **Subject:** "Welcome to Fantasy League Chess - Your Fantasy Chess Adventure Begins!"
- **Content:** Beautiful HTML with Fantasy League Chess branding
- **Trigger:** After signup (when email confirmation is disabled)

### **Custom Email:**
- **Subject:** Whatever you specify
- **Content:** Custom HTML content
- **Trigger:** Manual testing

### **Weekly Results Email:**
- **Subject:** "Weekly Results - [Date]"
- **Content:** Your weekly performance breakdown
- **Trigger:** After Titled Tuesday

## 🎯 **Quick Test Commands**

**Run these in your browser console:**

```javascript
// Quick welcome email test
sendWelcomeEmail('sohampjoshi@outlook.com');

// Quick custom email test
sendCustomEmail('sohampjoshi@outlook.com', 'Test Subject', '<h1>Test Email</h1>');

// Quick weekly results test
sendWeeklyResultsEmail('sohampjoshi@outlook.com', { week: '2024-01-15', totalPoints: 1000, leagues: [] });
```

## 🚀 **Next Steps**

1. **Test welcome email** - Sign up with a new email
2. **Test custom email** - Use browser console commands
3. **Test weekly results** - Join a league and wait for results
4. **Check all emails** in your Outlook inbox
5. **Verify SMTP is working** for all email types

**Your direct SMTP email system supports all these email types at $0/month cost!** 🎉
