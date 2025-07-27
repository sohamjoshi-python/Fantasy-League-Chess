#!/usr/bin/env python3
"""
Test Discord Environment Variables
"""

import os
import requests
import json

# Supabase configuration
SUPABASE_URL = "https://wdbwzvnkfbyzazodfhsw.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NzU2MzIsImV4cCI6MjA2OTE1MTYzMn0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8"

def test_discord_function():
    """Test the Discord function with detailed error reporting"""
    print("🧪 Testing Discord Function...")
    
    # Test data
    test_data = {
        "action": "create_league_channel",
        "leagueName": "Test League",
        "leagueId": "test-league-id"
    }
    
    try:
        # Call the Discord function
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/discord-bot",
            headers={
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "Content-Type": "application/json"
            },
            json=test_data,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            print("✅ Discord function is working!")
            return True
        else:
            print(f"❌ Discord function failed with status {response.status_code}")
            
            # Try to parse error response
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print("Could not parse error response as JSON")
            
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    print("🔍 Discord Environment Test")
    print("=" * 40)
    
    # Test the function
    success = test_discord_function()
    
    print("\n" + "=" * 40)
    if success:
        print("🎉 Discord integration is working!")
    else:
        print("❌ Discord integration needs attention")
        print("\nCommon issues:")
        print("1. Discord bot token not set in Supabase")
        print("2. Discord main server ID not set in Supabase")
        print("3. Bot doesn't have proper permissions")
        print("4. Bot not added to the Discord server")
        print("\nCheck your Supabase project settings for:")
        print("- DISCORD_BOT_TOKEN")
        print("- DISCORD_MAIN_SERVER_ID")

if __name__ == "__main__":
    main() 