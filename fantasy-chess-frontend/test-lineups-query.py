import requests
import json

def test_lineups_query():
    """Test the lineups query that's causing 406 errors"""
    
    url = "https://wdbwzvnkfbyzazodfhsw.supabase.co/rest/v1/lineups"
    
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
        "Content-Type": "application/json",
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    }
    
    # Test different query variations
    test_queries = [
        # Original query that's failing
        {
            "params": {
                "select": "*",
                "user_id": "eq.4a6364e1-426c-4c37-9fe3-b3eab4cf1425",
                "league_id": "eq.aa72597c-7ac4-4164-ae8e-891389b4a641",
                "week_start_date": "eq.2025-07-21"
            },
            "name": "Original failing query"
        },
        # Simplified query
        {
            "params": {
                "select": "*"
            },
            "name": "Simple select all"
        },
        # Query with just user_id
        {
            "params": {
                "select": "*",
                "user_id": "eq.4a6364e1-426c-4c37-9fe3-b3eab4cf1425"
            },
            "name": "Query with user_id only"
        }
    ]
    
    for i, test in enumerate(test_queries):
        print(f"\n=== Test {i+1}: {test['name']} ===")
        print(f"URL: {url}")
        print(f"Params: {test['params']}")
        
        try:
            response = requests.get(url, headers=headers, params=test['params'])
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success! Found {len(data)} records")
                if data:
                    print(f"Sample data: {json.dumps(data[0], indent=2)}")
            else:
                print(f"❌ Error! Response: {response.text}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    test_lineups_query() 