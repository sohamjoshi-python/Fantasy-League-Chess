# Discord Integration Setup Guide for Pawn Royale

## 🎯 **Complete Discord Integration Implementation**

This guide will walk you through setting up Discord integration for Pawn Royale, including:
- Main Discord server for announcements
- League-specific Discord servers
- "Join Me" buttons for league members

## 📋 **Step 1: Discord Bot Setup**

### **1.1 Create Discord Application**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Pawn Royale Bot"
4. Go to "Bot" section
5. Click "Add Bot"
6. Copy the **Bot Token** (we'll need this)
7. Go to "General Information" and copy the **Client ID**

### **1.2 Configure Bot Permissions**
In the Bot section, enable these permissions:
- ✅ Send Messages
- ✅ Embed Links
- ✅ Manage Channels
- ✅ Manage Server
- ✅ Create Invites
- ✅ Use Slash Commands
- ✅ Read Message History

### **1.3 Generate OAuth2 URL**
1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select permissions: `Administrator` (for league server creation)
4. Copy the generated URL

## 🏠 **Step 2: Main Discord Server Setup**

### **2.1 Create Main Server**
1. Use the OAuth2 URL to invite the bot to your main server
2. Create these channels:
   - `#announcements` - For league announcements
   - `#general` - For general chat
   - `#how-to-play` - For game instructions
   - `#support` - For user support

### **2.2 Get Channel IDs**
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on each channel → "Copy ID"
3. Note down these IDs:
   - Main Server ID
   - Announcements Channel ID
   - General Channel ID

## 🔧 **Step 3: Environment Variables**

Add these to your Supabase environment variables:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Main Discord Server Configuration
DISCORD_MAIN_SERVER_ID=your_main_server_id_here
DISCORD_ANNOUNCEMENTS_CHANNEL_ID=your_announcements_channel_id_here
DISCORD_GENERAL_CHANNEL_ID=your_general_channel_id_here
```

## 🚀 **Step 4: Deploy Discord Functions**

### **4.1 Deploy Discord Bot Function**
```bash
cd fantasy-chess-frontend
supabase functions deploy discord-bot
```

### **4.2 Apply Database Schema**
```bash
# Run the Discord database schema
psql -d your_database -f discord-database-schema.sql
```

## 🧪 **Step 5: Test the Integration**

### **5.1 Run Test Script**
```bash
python test-discord-integration.py
```

This will:
- ✅ Check environment variables
- ✅ Test Discord bot function
- ✅ Send test announcement
- ✅ Test league server creation

### **5.2 Manual Testing**
1. Create a new league in the frontend
2. Check if Discord server is created
3. Verify announcement is posted to main server
4. Test "Join Discord" button in league page

## 🎮 **Step 6: Frontend Integration**

### **6.1 Add Discord Component to League Pages**
The `DiscordIntegration` component is ready to use:

```tsx
import DiscordIntegration from '../components/DiscordIntegration'

// In your league page
<DiscordIntegration league={league} />
```

### **6.2 League Creation Integration**
Discord server creation is already integrated into the league creation process.

## 📊 **Features Implemented**

### **✅ Main Server Features:**
- 📢 Post league announcements
- 🎉 Welcome new leagues
- 📈 Weekly results summaries
- 🔔 System updates

### **✅ League-Specific Server Features:**
- 🏆 Auto-create Discord server for each league
- 📢 Create channels: #announcements, #general, #draft, #lineups, #results, #strategy
- 🔗 Generate "Join Me" invite links
- 👥 Auto-invite league members
- 📊 Post league-specific updates

### **✅ User Experience:**
- 🎯 "Join Discord" buttons in league pages
- 🔄 Generate new invite links
- 📱 Mobile-friendly Discord integration
- 🎨 Beautiful UI with Discord branding

## 🔐 **Security & Permissions**

### **Bot Permissions:**
- Minimal required permissions
- Rate limiting implemented
- Secure token storage
- Audit bot actions

### **User Privacy:**
- Optional Discord integration
- Clear privacy policy
- User consent for Discord features

## 🎨 **Discord Server Structure**

### **Main Pawn Royale Server:**
```
🏆 Pawn Royale
├── 📢 #announcements
├── 💬 #general
├── 🎮 #how-to-play
└── 🆘 #support
```

### **League-Specific Server:**
```
🏆 [League Name]
├── 📢 #announcements
├── 💬 #general
├── 🎯 #draft
├── 📊 #lineups
├── 🏆 #results
└── 🎮 #strategy
```

## 🚀 **Usage Examples**

### **League Creation:**
When a user creates a league:
1. ✅ Discord server is automatically created
2. ✅ Channels are set up with proper names
3. ✅ Invite link is generated
4. ✅ Announcement is posted to main server
5. ✅ League data is updated with Discord info

### **User Joining League:**
When a user joins a league:
1. ✅ "Join Discord" button becomes available
2. ✅ User can click to join the league's Discord server
3. ✅ Welcome message is posted in league server

### **Weekly Results:**
When weekly results are processed:
1. ✅ Results are posted to league's #results channel
2. ✅ Summary is posted to main #announcements channel
3. ✅ League members are notified via Discord

## 🔧 **Troubleshooting**

### **Common Issues:**

**1. Bot Token Invalid**
- Check if bot token is correct
- Ensure bot is properly configured
- Verify bot has required permissions

**2. Server Creation Fails**
- Check bot has "Manage Server" permission
- Verify bot is in the main server
- Check Discord API rate limits

**3. Invite Links Don't Work**
- Ensure bot has "Create Invites" permission
- Check if server is full
- Verify invite link format

**4. Messages Not Sending**
- Check channel permissions
- Verify bot can send messages
- Check message content for invalid characters

### **Debug Commands:**
```bash
# Test Discord bot function
curl -X POST "https://your-project.supabase.co/functions/v1/discord-bot" \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"action":"send_main_announcement","message":"Test message"}'
```

## 📈 **Future Enhancements**

### **Advanced Features:**
- Discord slash commands for league management
- Real-time game updates via Discord
- Discord role management based on league standings
- Integration with Discord voice channels for live events

### **Analytics:**
- Track Discord engagement
- Monitor server activity
- User participation metrics

## 🎉 **Success Checklist**

- ✅ Discord bot created and configured
- ✅ Main server set up with proper channels
- ✅ Environment variables configured
- ✅ Discord functions deployed
- ✅ Database schema applied
- ✅ Frontend integration complete
- ✅ Test script passes
- ✅ Manual testing successful

---

**🎯 Your Discord integration is now ready!** 

Users can create leagues with automatic Discord servers, join via "Join Me" buttons, and receive real-time updates and announcements through Discord! 