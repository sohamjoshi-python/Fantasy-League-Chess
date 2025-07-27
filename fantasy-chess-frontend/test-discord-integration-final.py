#!/usr/bin/env python3
"""
Test Discord Integration - Final Verification
"""

import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

def test_discord_bot_function():
    """Test the Discord bot function"""
    print("🧪 Testing Discord Bot Function...")
    
    # Test data
    test_data = {
        "action": "create_league_channel",
        "leagueName": "Test League",
        "leagueId": "test-league-id"
    }
    
    try:
        # Call the Discord bot function
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/discord-bot",
            headers={
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "Content-Type": "application/json"
            },
            json=test_data
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Discord bot function is working!")
            return True
        else:
            print("❌ Discord bot function failed")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Discord bot: {e}")
        return False

def check_environment_variables():
    """Check if required environment variables are set"""
    print("🔍 Checking Environment Variables...")
    
    required_vars = [
        'DISCORD_BOT_TOKEN',
        'DISCORD_MAIN_SERVER_ID'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        print("Please set these in your Supabase project settings:")
        for var in missing_vars:
            print(f"  - {var}")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

def main():
    print("🚀 Discord Integration Test - Final Verification")
    print("=" * 50)
    
    # Check environment variables
    env_ok = check_environment_variables()
    
    if not env_ok:
        print("\n❌ Cannot proceed without environment variables")
        return
    
    # Test Discord bot function
    bot_ok = test_discord_bot_function()
    
    print("\n" + "=" * 50)
    if bot_ok:
        print("🎉 Discord Integration is ready!")
        print("\nNext steps:")
        print("1. Create a new league in the frontend")
        print("2. Check that a Discord channel is created")
        print("3. Verify the 'Join Discord Channel' button appears")
    else:
        print("❌ Discord Integration needs attention")
        print("\nTroubleshooting:")
        print("1. Check Discord bot token is valid")
        print("2. Verify bot has proper permissions in Discord server")
        print("3. Ensure bot is added to the main Discord server")

if __name__ == "__main__":
    main() 