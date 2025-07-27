import requests
import json

def test_discord_bot_detailed():
    """Test the Discord bot function with detailed error reporting"""
    
    url = "https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/discord-bot"
    
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
        "Content-Type": "application/json"
    }
    
    payload = {
        "action": "create_league_channel",
        "leagueName": "Test League Debug",
        "leagueId": "test-league-id-123"
    }
    
    print("Testing Discord bot function...")
    print(f"URL: {url}")
    print(f"Headers: {json.dumps(headers, indent=2)}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ Success!")
            try:
                data = response.json()
                print(f"Response Data: {json.dumps(data, indent=2)}")
            except:
                print("Response is not JSON")
        else:
            print(f"\n❌ Error! Status: {response.status_code}")
            
    except Exception as e:
        print(f"\nException: {e}")
        print(f"Exception type: {type(e)}")

if __name__ == "__main__":
    test_discord_bot_detailed() 