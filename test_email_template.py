import requests
import base64
import os
from dotenv import load_dotenv

load_dotenv()

def create_welcome_email_html():
    """Create a welcome email template with Pawn Royale branding"""
    
    # Pawn Royale color scheme
    primary_color = "#8B4513"  # Saddle Brown
    secondary_color = "#D2691E"  # Chocolate
    accent_color = "#F4A460"  # Sandy Brown
    background_color = "#FFF8DC"  # Cornsilk
    text_color = "#2F2F2F"  # Dark Gray
    light_text = "#666666"  # Medium Gray
    
    # Simple text-based logo
    logo_html = """
    <div style="font-size: 48px; font-weight: bold; color: white; margin-bottom: 15px;">
        ♔ Pawn Royale ♔
    </div>
    """
    
    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pawn Royale - Fantasy Chess</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                background-color: {background_color};
                color: {text_color};
                line-height: 1.6;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, {primary_color}, {secondary_color});
                padding: 30px 20px;
                text-align: center;
                color: white;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }}
            .header p {{
                margin: 10px 0 0 0;
                font-size: 16px;
                opacity: 0.9;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .welcome-section {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .welcome-section h2 {{
                color: {primary_color};
                font-size: 24px;
                margin-bottom: 15px;
            }}
            .cta-button {{
                display: inline-block;
                background: linear-gradient(135deg, {primary_color}, {secondary_color});
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                transition: transform 0.2s ease;
            }}
            .cta-button:hover {{
                transform: translateY(-2px);
            }}
            .footer {{
                background-color: {primary_color};
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 14px;
            }}
            .footer a {{
                color: {accent_color};
                text-decoration: none;
            }}
            .highlight {{
                background-color: {accent_color};
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }}
            .feature-list {{
                list-style: none;
                padding: 0;
            }}
            .feature-list li {{
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }}
            .feature-list li:before {{
                content: "♔";
                color: {primary_color};
                font-weight: bold;
                margin-right: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                {logo_html}
                <h1>Pawn Royale</h1>
                <p>Fantasy Chess League</p>
            </div>
            
            <div class="content">
                <div class="welcome-section">
                    <h2>Welcome to Pawn Royale! 🎯</h2>
                    <p>Your fantasy chess adventure begins now. Compete with the world's best players and prove your strategic mastery.</p>
                </div>
                
                <div class="highlight">
                    <strong>🎉 Your League is Ready!</strong><br>
                    Start building your dream team and competing in weekly tournaments
                </div>
                
                <h3 style="color: {primary_color}; margin-top: 30px;">🏆 What Makes Pawn Royale Special</h3>
                <ul class="feature-list">
                    <li><strong>Individual Baseline Scoring:</strong> Compete against your own historical performance</li>
                    <li><strong>Real Titled Tuesday Data:</strong> Use actual games from top players</li>
                    <li><strong>Dynamic Market:</strong> Buy, sell, and trade players strategically</li>
                    <li><strong>Weekly Tournaments:</strong> Compete in regular leagues</li>
                </ul>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="https://pawn-royale.vercel.app" class="cta-button">
                        🚀 Start Playing Now
                    </a>
                </div>
                
                <p style="color: {light_text}; font-size: 14px; text-align: center;">
                    Ready to dominate the chess world? Your strategic journey awaits!
                </p>
            </div>
            
            <div class="footer">
                <p>
                    <a href="https://pawn-royale.vercel.app/privacy">Privacy Policy</a> | 
                    <a href="https://pawn-royale.vercel.app/tos">Terms of Service</a> | 
                    <a href="mailto:support@pawnroyale.com">Support</a>
                </p>
                <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                    You received this email because you signed up for Pawn Royale.<br>
                    <a href="#" style="color: {accent_color};">Unsubscribe</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_template

def create_weekly_points_email_html():
    """Create a weekly points email template"""
    
    # Pawn Royale color scheme
    primary_color = "#8B4513"  # Saddle Brown
    secondary_color = "#D2691E"  # Chocolate
    accent_color = "#F4A460"  # Sandy Brown
    background_color = "#FFF8DC"  # Cornsilk
    text_color = "#2F2F2F"  # Dark Gray
    light_text = "#666666"  # Medium Gray
    
    # Simple text-based logo
    logo_html = """
    <div style="font-size: 48px; font-weight: bold; color: white; margin-bottom: 15px;">
        ♔ Pawn Royale ♔
    </div>
    """
    
    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pawn Royale - Weekly Results</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                background-color: {background_color};
                color: {text_color};
                line-height: 1.6;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, {primary_color}, {secondary_color});
                padding: 30px 20px;
                text-align: center;
                color: white;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            }}
            .header p {{
                margin: 10px 0 0 0;
                font-size: 16px;
                opacity: 0.9;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .week-header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .week-header h2 {{
                color: {primary_color};
                font-size: 24px;
                margin-bottom: 10px;
            }}
            .stats-container {{
                background-color: #f8f9fa;
                border-radius: 10px;
                padding: 25px;
                margin: 25px 0;
            }}
            .stat-row {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid #e9ecef;
            }}
            .stat-row:last-child {{
                border-bottom: none;
            }}
            .stat-label {{
                font-weight: 600;
                color: {primary_color};
            }}
            .stat-value {{
                font-weight: bold;
                font-size: 18px;
            }}
            .player-performance {{
                background: linear-gradient(135deg, {accent_color}, {secondary_color});
                color: white;
                padding: 20px;
                border-radius: 10px;
                margin: 25px 0;
            }}
            .player-performance h3 {{
                margin: 0 0 15px 0;
                font-size: 20px;
            }}
            .performance-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }}
            .performance-item {{
                text-align: center;
                padding: 10px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
            }}
            .performance-number {{
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
            }}
            .performance-label {{
                font-size: 12px;
                opacity: 0.9;
            }}
            .cta-button {{
                display: inline-block;
                background: linear-gradient(135deg, {primary_color}, {secondary_color});
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                transition: transform 0.2s ease;
            }}
            .cta-button:hover {{
                transform: translateY(-2px);
            }}
            .footer {{
                background-color: {primary_color};
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 14px;
            }}
            .footer a {{
                color: {accent_color};
                text-decoration: none;
            }}
            .highlight {{
                background-color: {accent_color};
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                {logo_html}
                <h1>Pawn Royale</h1>
                <p>Weekly Fantasy Chess Results</p>
            </div>
            
            <div class="content">
                <div class="week-header">
                    <h2>📊 Your Week 1 Results</h2>
                    <p>July 21-27, 2025</p>
                </div>
                
                <div class="highlight">
                    <strong>🎯 Excellent Performance!</strong><br>
                    You scored above your personal baseline this week
                </div>
                
                <div class="stats-container">
                    <h3 style="color: {primary_color}; margin-top: 0;">📈 League Performance</h3>
                    <div class="stat-row">
                        <span class="stat-label">Total Fantasy Points:</span>
                        <span class="stat-value">67.8</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">League Rank:</span>
                        <span class="stat-value">#3 of 12</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Games Analyzed:</span>
                        <span class="stat-value">5</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Average ACL:</span>
                        <span class="stat-value">22.3</span>
                    </div>
                </div>
                
                <div class="player-performance">
                    <h3>🏆 Top Performing Players</h3>
                    <div class="performance-grid">
                        <div class="performance-item">
                            <div class="performance-number">15.2</div>
                            <div class="performance-label">Hikaru</div>
                        </div>
                        <div class="performance-item">
                            <div class="performance-number">12.8</div>
                            <div class="performance-label">Magnus</div>
                        </div>
                        <div class="performance-item">
                            <div class="performance-number">11.5</div>
                            <div class="performance-label">Firouzja</div>
                        </div>
                        <div class="performance-item">
                            <div class="performance-number">9.3</div>
                            <div class="performance-label">Nepo</div>
                        </div>
                    </div>
                </div>
                
                <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
                    <h4 style="color: #28a745; margin-top: 0;">🎉 Key Achievement</h4>
                    <p><strong>Individual Baseline Bonus:</strong> You played 12.5 ACL points better than your average this week!</p>
                    <p>This earned you an additional 8.2 fantasy points through our individual baseline scoring system.</p>
                </div>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="https://pawn-royale.vercel.app/league" class="cta-button">
                        📊 View Full Results
                    </a>
                </div>
                
                <p style="color: {light_text}; font-size: 14px; text-align: center;">
                    Keep up the great work! Your strategic decisions are paying off.
                </p>
            </div>
            
            <div class="footer">
                <p>
                    <a href="https://pawn-royale.vercel.app/privacy">Privacy Policy</a> | 
                    <a href="https://pawn-royale.vercel.app/tos">Terms of Service</a> | 
                    <a href="mailto:support@pawnroyale.com">Support</a>
                </p>
                <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                    You received this email because you signed up for Pawn Royale.<br>
                    <a href="#" style="color: {accent_color};">Unsubscribe</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_template

def send_test_email(email_type="welcome"):
    """Send a test email using the specified template"""
    
    # Email configuration
    to_email = "sohampjoshi@outlook.com"
    
    if email_type == "welcome":
        subject = "🎯 Welcome to Pawn Royale - Your Fantasy Chess Adventure Begins!"
        html_content = create_welcome_email_html()
    elif email_type == "weekly":
        subject = "📊 Your Pawn Royale Weekly Results - Week 1"
        html_content = create_weekly_points_email_html()
    else:
        print("❌ Invalid email type. Use 'welcome' or 'weekly'")
        return False
    
    # Get environment variables
    sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
    from_email = os.getenv('FROM_EMAIL')
    
    if not sendgrid_api_key or not from_email:
        print("❌ Error: Missing SENDGRID_API_KEY or FROM_EMAIL environment variables")
        print("Please set these in your .env file:")
        print("SENDGRID_API_KEY=your_sendgrid_api_key")
        print("FROM_EMAIL=your_verified_sender_email")
        return False
    
    # Prepare the email payload
    payload = {
        "personalizations": [
            {
                "to": [{"email": to_email}],
                "subject": subject
            }
        ],
        "from": {"email": from_email, "name": "Pawn Royale"},
        "content": [
            {
                "type": "text/html",
                "value": html_content
            }
        ]
    }
    
    # Send the email
    try:
        response = requests.post(
            'https://api.sendgrid.com/v3/mail/send',
            headers={
                'Authorization': f'Bearer {sendgrid_api_key}',
                'Content-Type': 'application/json'
            },
            json=payload
        )
        
        if response.status_code == 202:
            print("✅ Email sent successfully!")
            print(f"📧 Sent to: {to_email}")
            print(f"📝 Subject: {subject}")
            print(f"🎨 Template: {email_type.capitalize()} Email")
            return True
        else:
            print(f"❌ Failed to send email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return False

def create_env_template():
    """Create a template .env file if it doesn't exist"""
    env_content = """# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=your_verified_sender_email@yourdomain.com

# Instructions:
# 1. Sign up for SendGrid at https://sendgrid.com
# 2. Create an API key in your SendGrid dashboard
# 3. Verify your sender email address in SendGrid
# 4. Replace the values above with your actual credentials
"""
    
    if not os.path.exists('.env'):
        with open('.env', 'w') as f:
            f.write(env_content)
        print("📝 Created .env template file")
        print("Please edit .env with your SendGrid credentials")
    else:
        print("📝 .env file already exists")

if __name__ == "__main__":
    print("🎯 Pawn Royale Email Template Test")
    print("=" * 50)
    
    # Create .env template if needed
    create_env_template()
    
    # Check if environment variables are set
    if not os.getenv('SENDGRID_API_KEY') or not os.getenv('FROM_EMAIL'):
        print("\n❌ Environment variables not found!")
        print("Please set up your .env file with SendGrid credentials.")
        print("\n📋 Setup Instructions:")
        print("1. Sign up for SendGrid (free tier available)")
        print("2. Create an API key in your SendGrid dashboard")
        print("3. Verify your sender email address")
        print("4. Update the .env file with your credentials")
        print("5. Run this script again")
    else:
        print("\n🚀 Choose email type to send:")
        print("1. Welcome Email")
        print("2. Weekly Points Email")
        
        choice = input("\nEnter choice (1 or 2): ").strip()
        
        if choice == "1":
            print("\n📧 Sending welcome email...")
            success = send_test_email("welcome")
        elif choice == "2":
            print("\n📊 Sending weekly points email...")
            success = send_test_email("weekly")
        else:
            print("❌ Invalid choice. Please run again and select 1 or 2.")
            exit()
        
        if success:
            print("\n✅ Test completed successfully!")
            print("Check your email at sohampjoshi@outlook.com")
        else:
            print("\n❌ Test failed. Check the error messages above.") 