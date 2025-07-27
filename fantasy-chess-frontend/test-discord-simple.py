import requests
import json

def test_discord_bot_direct():
    """Test the Discord bot function directly via HTTP"""
    
    url = "https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/discord-bot"
    
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
        "Content-Type": "application/json"
    }
    
    payload = {
        "action": "create_league_channel",
        "leagueName": "Test League",
        "leagueId": "test-123"
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Success!")
        else:
            print("❌ Error!")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_discord_bot_direct() 