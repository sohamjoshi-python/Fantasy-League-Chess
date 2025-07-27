import requests
import os
from dotenv import load_dotenv

load_dotenv()

def test_supabase_email_function():
    """Test the updated Supabase email function with different email types"""
    
    # Get environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_anon_key:
        print("❌ Missing Supabase credentials in .env file")
        print("Please set SUPABASE_URL and SUPABASE_ANON_KEY")
        return
    
    # Test email configurations
    test_cases = [
        {
            "name": "Welcome Email",
            "payload": {
                "to": "no-reply@fantasyleaguechess.com",
                "emailType": "welcome"
            }
        },
        {
            "name": "Weekly Results Email",
            "payload": {
                "to": "no-reply@fantasyleaguechess.com",
                "emailType": "weekly_results",
                "userEmail": "no-reply@fantasyleaguechess.com"
            }
        },
        {
            "name": "Plain Text Email",
            "payload": {
                "to": "no-reply@fantasyleaguechess.com",
                "subject": "Test Plain Text Email",
                "text": "This is a test plain text email from Fantasy League Chess."
            }
        }
    ]
    
    print("🎯 Testing Updated Supabase Email Function")
    print("=" * 50)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: {test_case['name']}")
        print("-" * 30)
        
        try:
            # Call the Supabase Edge Function
            response = requests.post(
                f"{supabase_url}/functions/v1/send-email",
                headers={
                    "Authorization": f"Bearer {supabase_anon_key}",
                    "Content-Type": "application/json"
                },
                json=test_case["payload"]
            )
            
            if response.status_code == 200:
                print(f"✅ {test_case['name']} sent successfully!")
                if test_case["payload"].get("emailType") == "weekly_results":
                    result = response.json()
                    print(f"📊 Result: {result.get('message', 'Email sent')}")
            else:
                print(f"❌ Failed to send {test_case['name']}")
                print(f"Status: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error testing {test_case['name']}: {str(e)}")
    
    print(f"\n🎉 Email function testing completed!")
    print("Check your email at no-reply@fantasyleaguechess.com for all test emails.")

def create_env_template():
    """Create a template .env file if it doesn't exist"""
    env_content = """# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# SendGrid Configuration (for the Edge Function)
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=no-reply@fantasyleaguechess.com

# Instructions:
# 1. Get your Supabase URL and anon key from your Supabase dashboard
# 2. Set up SendGrid credentials for the Edge Function
# 3. Replace the values above with your actual credentials
"""
    
    if not os.path.exists('.env'):
        with open('.env', 'w') as f:
            f.write(env_content)
        print("📝 Created .env template file")
        print("Please edit .env with your Supabase and SendGrid credentials")
    else:
        print("📝 .env file already exists")

if __name__ == "__main__":
    print("🎯 Supabase Email Function Test")
    print("=" * 50)
    
    # Create .env template if needed
    create_env_template()
    
    # Check if environment variables are set
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_ANON_KEY'):
        print("\n❌ Environment variables not found!")
        print("Please set up your .env file with Supabase credentials.")
        print("\n📋 Setup Instructions:")
        print("1. Get your Supabase URL and anon key from your Supabase dashboard")
        print("2. Update the .env file with your credentials")
        print("3. Make sure your Edge Function is deployed")
        print("4. Run this script again")
    else:
        print("\n🚀 Testing email function...")
        test_supabase_email_function() 