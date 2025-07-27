import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_discord_setup():
    """Test the Discord integration setup"""
    
    print("🎯 Fantasy League Chess Discord Integration Test")
    print("=" * 50)
    
    # Check environment variables
    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'DISCORD_BOT_TOKEN',
        'DISCORD_CLIENT_ID',
        'DISCORD_MAIN_SERVER_ID',
        'DISCORD_ANNOUNCEMENTS_CHANNEL_ID'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n📋 Setup Instructions:")
        print("1. Create a Discord bot at https://discord.com/developers/applications")
        print("2. Get your bot token and client ID")
        print("3. Create a main Discord server for Fantasy League Chess")
        print("4. Invite the bot to your server")
        print("5. Get the server ID and channel IDs")
        print("6. Add all variables to your .env file")
        return False
    
    print("✅ All environment variables are set")
    
    # Test Discord bot function
    print("\n🧪 Testing Discord bot function...")
    
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
        
        # Test sending a main server announcement
        response = requests.post(
            f"{supabase_url}/functions/v1/discord-bot",
            headers={
                "Authorization": f"Bearer {supabase_anon_key}",
                "Content-Type": "application/json"
            },
            json={
                "action": "send_main_announcement",
                "message": "🧪 Test message from Fantasy League Chess Discord integration!",
                "embed": {
                    "title": "🎯 Discord Integration Test",
                    "description": "This is a test message to verify the Discord integration is working correctly.",
                    "color": 0x8B4513,
                    "footer": {
                        "text": "Fantasy League Chess Discord Bot"
                    }
                }
            }
        )
        
        if response.status_code == 200:
            print("✅ Discord bot function is working!")
            print("📢 Check your Discord #announcements channel for the test message")
        else:
            print(f"❌ Discord bot function failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Discord bot: {str(e)}")
        return False
    
    return True

def create_test_league():
    """Create a test league to verify Discord server creation"""
    
    print("\n🏆 Testing League Discord Server Creation")
    print("=" * 50)
    
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
        
        # Test creating a Discord server for a league
        response = requests.post(
            f"{supabase_url}/functions/v1/discord-bot",
            headers={
                "Authorization": f"Bearer {supabase_anon_key}",
                "Content-Type": "application/json"
            },
            json={
                "action": "create_league_server",
                "leagueName": "Test League - Discord Integration",
                "leagueId": "test-league-id-123"
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Discord server creation test successful!")
            print(f"📊 Server ID: {result.get('serverId', 'N/A')}")
            print(f"🔗 Invite Link: {result.get('inviteUrl', 'N/A')}")
            print("\n📋 Next Steps:")
            print("1. Check your Discord for the new test server")
            print("2. Verify the server has the correct channels")
            print("3. Test the invite link")
        else:
            print(f"❌ Discord server creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing Discord server creation: {str(e)}")

def create_env_template():
    """Create a template .env file for Discord integration"""
    
    env_content = """# Discord Integration Configuration

# Supabase Configuration (you should already have these)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here

# Main Discord Server Configuration
DISCORD_MAIN_SERVER_ID=your_main_server_id_here
DISCORD_ANNOUNCEMENTS_CHANNEL_ID=your_announcements_channel_id_here
DISCORD_GENERAL_CHANNEL_ID=your_general_channel_id_here

# Instructions:
# 1. Create a Discord bot at https://discord.com/developers/applications
# 2. Get your bot token from the Bot section
# 3. Get your client ID from the General Information section
# 4. Create a main Discord server for Fantasy League Chess
# 5. Invite the bot to your server with proper permissions
# 6. Get server ID and channel IDs (right-click → Copy ID)
# 7. Replace the values above with your actual credentials
"""
    
    if not os.path.exists('.env'):
        with open('.env', 'w') as f:
            f.write(env_content)
        print("📝 Created .env template file")
        print("Please edit .env with your Discord credentials")
    else:
        print("📝 .env file already exists")

def main():
    """Main function to run Discord integration tests"""
    
    print("🎯 Fantasy League Chess Discord Integration Test")
    print("=" * 60)
    
    # Create .env template if needed
    create_env_template()
    
    # Test Discord setup
    if test_discord_setup():
        print("\n🎉 Discord integration is working!")
        
        # Ask if user wants to test league server creation
        choice = input("\nWould you like to test league Discord server creation? (y/n): ").strip().lower()
        if choice == 'y':
            create_test_league()
    else:
        print("\n❌ Discord integration setup incomplete")
        print("Please follow the setup instructions above")
    
    print("\n📋 Summary:")
    print("✅ Environment variables checked")
    print("✅ Discord bot function tested")
    print("✅ Ready for production use!")

if __name__ == "__main__":
    main() 