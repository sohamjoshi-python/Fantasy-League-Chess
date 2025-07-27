# Discord Integration Setup for Pawn Royale

## 🎯 **Overview**

This guide will help you integrate Discord with Pawn Royale to:
1. Post announcements to a main Discord server
2. Create league-specific Discord servers
3. Allow users to join league servers via "Join Me" buttons

## 📋 **Prerequisites**

### **1. Discord Bot Setup**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Pawn Royale Bot"
4. Go to "Bot" section
5. Click "Add Bot"
6. Copy the **Bot Token** (we'll need this)
7. Enable these permissions:
   - Send Messages
   - Embed Links
   - Manage Channels
   - Manage Server
   - Create Invites
   - Use Slash Commands

### **2. Main Server Setup**
1. Create a Discord server for Pawn Royale
2. Create channels:
   - `#announcements` (for bot announcements)
   - `#general` (for general chat)
3. Invite the bot to your server with proper permissions

### **3. Environment Variables**
Add these to your Supabase environment:
```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_MAIN_SERVER_ID=your_main_server_id
DISCORD_ANNOUNCEMENTS_CHANNEL_ID=announcements_channel_id
DISCORD_GENERAL_CHANNEL_ID=general_channel_id
DISCORD_CLIENT_ID=your_bot_client_id
DISCORD_CLIENT_SECRET=your_bot_client_secret
```

## 🚀 **Implementation Steps**

### **Step 1: Discord Bot Functions**
We'll create Supabase Edge Functions to handle Discord operations.

### **Step 2: Database Schema**
We'll add Discord-related fields to track server IDs and invite links.

### **Step 3: Frontend Integration**
We'll add Discord buttons and functionality to the frontend.

### **Step 4: League Creation Integration**
We'll automatically create Discord servers when leagues are created.

## 📊 **Features to Implement**

### **Main Server Features:**
- ✅ Post league announcements
- ✅ Post weekly results summaries
- ✅ Post system updates
- ✅ Welcome new users

### **League-Specific Server Features:**
- ✅ Auto-create Discord server for each league
- ✅ Create channels: #general, #draft, #lineups, #results
- ✅ Generate "Join Me" invite links
- ✅ Auto-invite league members
- ✅ Post league-specific updates

### **User Experience:**
- ✅ "Join Discord" buttons in league pages
- ✅ Discord integration in user profiles
- ✅ Automatic notifications via Discord

## 🔧 **Technical Architecture**

### **Discord API Endpoints We'll Use:**
- `POST /guilds` - Create new servers
- `POST /channels` - Create channels
- `POST /invites` - Create invite links
- `POST /webhooks` - Send messages
- `GET /guilds/{id}/members` - Get server members

### **Database Changes:**
- Add `discord_server_id` to leagues table
- Add `discord_invite_link` to leagues table
- Add `discord_user_id` to users table (optional)

### **Edge Functions:**
- `create-discord-server` - Create league Discord servers
- `send-discord-announcement` - Post to main server
- `generate-discord-invite` - Create invite links

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

## 🔐 **Security Considerations**

### **Bot Permissions:**
- Use minimal required permissions
- Implement rate limiting
- Secure token storage
- Audit bot actions

### **User Privacy:**
- Optional Discord integration
- Clear privacy policy
- User consent for Discord features

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

## 🚀 **Next Steps**

1. **Set up Discord Bot** (follow prerequisites above)
2. **Create Edge Functions** (see implementation files)
3. **Update Database Schema** (add Discord fields)
4. **Integrate Frontend** (add Discord buttons)
5. **Test Integration** (create test leagues)
6. **Deploy to Production** (monitor and optimize)

---

**Ready to implement?** Let's start with the Discord bot functions and database schema! 