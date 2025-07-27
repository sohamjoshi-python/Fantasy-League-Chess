# Discord Function Setup Checklist

## 🔧 **Step 1: Get Your Service Role Key**

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy the **service_role** key (starts with `eyJ...`)
3. Update `test-discord-service-role.js` with your service role key

## 🔧 **Step 2: Check Function Permissions**

### **In Supabase Dashboard:**

1. Go to **Edge Functions** → **discord-bot**
2. Check **Function Settings**:
   - ✅ **Import maps** should be enabled
   - ✅ **JWT verification** should be **disabled** (for testing)
   - ✅ **Function should be deployed** (green status)

### **Function Configuration:**

The function should allow:
- ✅ **Authenticated requests** (with valid JWT)
- ✅ **Service role requests** (with service role key)
- ❌ **Unauthenticated requests** (optional, for testing)

## 🔧 **Step 3: Verify Environment Variables**

### **In Supabase Dashboard:**

1. Go to **Settings** → **Environment Variables**
2. Verify these are set:
   - ✅ `DISCORD_BOT_TOKEN` = Your Discord bot token
   - ✅ `DISCORD_MAIN_SERVER_ID` = Your Discord server ID
   - ✅ `SUPABASE_URL` = Your Supabase URL
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` = Your service role key

## 🔧 **Step 4: Test Function Access**

### **Run the Service Role Test:**

```bash
# First, update the service role key in the script
# Then run:
node test-discord-service-role.js
```

### **Expected Results:**

✅ **Function accessible** - OPTIONS request returns 200  
✅ **Service role auth** - POST request with service role key works  
✅ **Discord integration** - Function can create Discord channels  

## 🔧 **Step 5: Discord Bot Setup**

### **Discord Developer Portal:**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create/select your application
3. Go to **Bot** section
4. Copy the **Token**

### **Bot Permissions:**

Add bot to your server with these permissions:
- ✅ **Manage Channels**
- ✅ **Create Invite**
- ✅ **Send Messages**
- ✅ **View Channels**

### **Server ID:**

1. Enable **Developer Mode** in Discord
2. Right-click your server → **Copy Server ID**

## 🔧 **Step 6: Troubleshooting**

### **If Function Returns 401:**
- Check JWT verification settings
- Verify service role key is correct
- Ensure function is deployed

### **If Function Returns 500:**
- Check environment variables are set
- Verify Discord bot token is valid
- Ensure bot is added to server

### **If Discord API Fails:**
- Check bot permissions
- Verify server ID is correct
- Ensure bot token is valid

## 🔧 **Step 7: Test Commands**

### **Run Service Role Test:**
```bash
node test-discord-service-role.js
```

### **Run Basic Test:**
```bash
node test-discord-terminal.js
```

### **Check Function Logs:**
- Go to Supabase Dashboard → Edge Functions → discord-bot → Logs
- Look for any error messages

## 🎯 **Success Criteria**

When everything is working:
- ✅ Service role test passes
- ✅ Function can create Discord channels
- ✅ Environment variables are accessible
- ✅ No authentication errors
- ✅ Discord channels are created successfully

## 🚀 **Next Steps**

Once the backend is working:
1. Test from frontend by creating a league
2. Verify Discord channel is created
3. Check invite link works
4. Test "Join Discord Channel" button 