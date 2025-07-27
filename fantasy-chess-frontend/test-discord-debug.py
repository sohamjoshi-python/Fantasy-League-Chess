import os
import requests
import json
from supabase import create_client, Client

# Load environment variables
SUPABASE_URL = "https://wdbwzvnkfbyzazodfhsw.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def test_discord_bot_function():
    """Test the Discord bot function to see what's causing the 500 error"""
    
    print("Testing Discord bot function...")
    
    # Test payload
    payload = {
        "action": "create_league_channel",
        "leagueName": "Test League Debug",
        "leagueId": "test-league-id-123"
    }
    
    try:
        # Call the Discord bot function
        response = supabase.functions.invoke(
            'discord-bot',
            invoke_options={'body': payload}
        )
        
        print("✅ Discord bot function response:")
        print(json.dumps(response, indent=2))
        
    except Exception as e:
        print(f"❌ Error calling Discord bot function: {e}")
        print(f"Error type: {type(e)}")
        
        # Try to get more details about the error
        if hasattr(e, 'response'):
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text}")

def test_environment_variables():
    """Test if environment variables are set correctly"""
    print("\nChecking environment variables...")
    
    # These should be set in your Supabase project settings
    required_vars = [
        'DISCORD_BOT_TOKEN',
        'DISCORD_CLIENT_ID', 
        'DISCORD_MAIN_SERVER_ID'
    ]
    
    for var in required_vars:
        print(f"  {var}: {'✅ Set' if var in os.environ else '❌ Not set'}")

if __name__ == "__main__":
    print("=== Discord Bot Function Debug Test ===\n")
    
    test_environment_variables()
    test_discord_bot_function()
    
    print("\n=== Debug Complete ===") 