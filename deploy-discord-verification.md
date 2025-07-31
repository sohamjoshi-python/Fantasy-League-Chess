# Discord Verification System Deployment

## 🚀 Step 1: Deploy the New Edge Function

1. **Go to Supabase Dashboard** → **Edge Functions**
2. **Create a new function** called `discord-bot-verification`
3. **Copy the code** from `fantasy-chess-frontend/discord-bot-verification.ts`
4. **Deploy the function**

## 🔧 Step 2: Test the Verification System

Run the test script:
```bash
node test-discord-verification.js
```

## 📋 Step 3: Check Database Schema

Make sure the `leagues` table has:
- `join_code` column (for league codes)
- `discord_role_id` column
- `discord_server_id` column
- `discord_invite_link` column

## 🎯 Step 4: Test the Full Flow

1. Create a test league with a join code
2. Test the Discord channel creation
3. Test the user verification process

## 📝 Expected Test Results:

✅ **League Creation**: Should create channel + role + store in DB
✅ **User Verification**: Should verify email against league membership
✅ **Role Assignment**: Should assign role to verified users
✅ **Error Handling**: Should handle invalid codes/emails gracefully 