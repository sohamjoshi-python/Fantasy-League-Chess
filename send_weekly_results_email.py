import requests
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import pandas as pd
from datetime import datetime, timedelta

load_dotenv()

# Initialize Supabase client
url: str = os.getenv("SB_URL")
key: str = os.getenv("SB_KEY")
supabase: Client = create_client(url, key)

def get_user_leagues(user_email):
    """Get all leagues that a user is a member of"""
    try:
        # First get the user ID from the email
        user_response = supabase.table("users").select("id").eq("email", user_email).execute()
        
        if not user_response.data:
            print(f"❌ User not found with email: {user_email}")
            return []
        
        user_id = user_response.data[0]['id']
        
        # Get all leagues the user is a member of
        leagues_response = supabase.table("league_members").select("""
            league_id,
            leagues!inner(
                id,
                name,
                start_date,
                end_date
            )
        """).eq("user_id", user_id).execute()
        
        return leagues_response.data
        
    except Exception as e:
        print(f"❌ Error fetching user leagues: {str(e)}")
        return []

def get_weekly_lineup_results(league_id, week_start_date):
    """Get lineup results for a specific week"""
    try:
        # Get lineups for the week with user information
        lineups_response = supabase.table("lineups").select("""
            id,
            user_id,
            total_points,
            week_start_date
        """).eq("league_id", league_id).eq("week_start_date", week_start_date).execute()
        
        # Get user information for each lineup
        lineup_results = []
        for lineup in lineups_response.data:
            user_response = supabase.table("users").select("email, username").eq("id", lineup['user_id']).execute()
            if user_response.data:
                lineup['users'] = user_response.data[0]
                lineup_results.append(lineup)
        
        return lineup_results
        
    except Exception as e:
        print(f"❌ Error fetching lineup results: {str(e)}")
        return []

def get_user_team_players(user_id, league_id):
    """Get players in user's team for the league"""
    try:
        teams_response = supabase.table("teams").select("player_ids").eq("user_id", user_id).eq("league_id", league_id).execute()
        
        if not teams_response.data or not teams_response.data[0]['player_ids']:
            return []
        
        player_ids = teams_response.data[0]['player_ids']
        
        # Get player details
        players_response = supabase.table("chess_players").select("id, name, elo").in_("id", player_ids).execute()
        
        return players_response.data
        
    except Exception as e:
        print(f"❌ Error fetching team players: {str(e)}")
        return []

def get_player_weekly_performance(player_name, week_start_date):
    """Get a player's performance for the week"""
    try:
        # Get games for the player in the week
        week_end_date = week_start_date + timedelta(days=6)
        
        games_response = supabase.table("games").select("""
            white,
            black,
            result,
            white_average_centipawn_loss,
            black_average_centipawn_loss,
            white_points,
            black_points
        """).or_(f"white.eq.{player_name},black.eq.{player_name}").gte("date", week_start_date.strftime("%Y-%m-%d")).lte("date", week_end_date.strftime("%Y-%m-%d")).execute()
        
        total_points = 0
        games_played = 0
        
        for game in games_response.data:
            if game['white'] == player_name:
                total_points += game['white_points'] or 0
                games_played += 1
            elif game['black'] == player_name:
                total_points += game['black_points'] or 0
                games_played += 1
        
        return {
            'games_played': games_played,
            'total_points': total_points,
            'avg_points': total_points / games_played if games_played > 0 else 0
        }
        
    except Exception as e:
        print(f"❌ Error fetching player performance: {str(e)}")
        return {'games_played': 0, 'total_points': 0, 'avg_points': 0}

def create_weekly_results_email_html(user_email, league_data, lineup_results, team_players):
    """Create personalized weekly results email"""
    
    # Pawn Royale color scheme
    primary_color = "#8B4513"  # Saddle Brown
    secondary_color = "#D2691E"  # Chocolate
    accent_color = "#F4A460"  # Sandy Brown
    background_color = "#FFF8DC"  # Cornsilk
    text_color = "#2F2F2F"  # Dark Gray
    light_text = "#666666"  # Medium Gray
    
    # Get user's lineup
    user_lineup = None
    for lineup in lineup_results:
        if lineup['users']['email'] == user_email:
            user_lineup = lineup
            break
    
    if not user_lineup:
        return None
    
    # Get week info
    week_start = datetime.strptime(user_lineup['week_start_date'], "%Y-%m-%d")
    week_end = week_start + timedelta(days=6)
    week_range = f"{week_start.strftime('%B %d')} - {week_end.strftime('%B %d, %Y')}"
    
    # Calculate league rank
    sorted_lineups = sorted(lineup_results, key=lambda x: x['total_points'] or 0, reverse=True)
    user_rank = next((i + 1 for i, lineup in enumerate(sorted_lineups) if lineup['users']['email'] == user_email), 0)
    total_players = len(lineup_results)
    
    # Get top performing players from user's team
    player_performances = []
    for player in team_players[:5]:  # Top 5 players
        performance = get_player_weekly_performance(player['name'], week_start)
        if performance['games_played'] > 0:
            player_performances.append({
                'name': player['name'],
                'points': performance['total_points'],
                'games': performance['games_played'],
                'avg_points': performance['avg_points']
            })
    
    # Sort by points
    player_performances.sort(key=lambda x: x['points'], reverse=True)
    
    # Simple text-based logo
    logo_html = """
    <div style="font-size: 48px; font-weight: bold; color: white; margin-bottom: 15px;">
        ♔ Fantasy League Chess ♔
    </div>
    """
    
    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fantasy League Chess - Weekly Results</title>
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
                <h1>Fantasy League Chess</h1>
                <p>Weekly Fantasy Chess Results</p>
            </div>
            
            <div class="content">
                <div class="week-header">
                    <h2>📊 Your Weekly Results</h2>
                    <p>{week_range}</p>
                    <p><strong>League:</strong> {league_data['leagues']['name']}</p>
                </div>
                
                <div class="highlight">
                    <strong>🎯 Your Performance Summary</strong><br>
                    Real results from your fantasy chess lineup
                </div>
                
                <div class="stats-container">
                    <h3 style="color: {primary_color}; margin-top: 0;">📈 League Performance</h3>
                    <div class="stat-row">
                        <span class="stat-label">Total Fantasy Points:</span>
                        <span class="stat-value">{user_lineup['total_points']:.2f}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">League Rank:</span>
                        <span class="stat-value">#{user_rank} of {total_players}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Week Period:</span>
                        <span class="stat-value">{week_range}</span>
                    </div>
                </div>
    """
    
    # Add player performances if available
    if player_performances:
        html_template += f"""
                <div class="player-performance">
                    <h3>🏆 Your Top Performing Players</h3>
                    <div class="performance-grid">
        """
        
        for player in player_performances[:4]:  # Show top 4
            html_template += f"""
                        <div class="performance-item">
                            <div class="performance-number">{player['points']:.1f}</div>
                            <div class="performance-label">{player['name']}</div>
                        </div>
            """
        
        html_template += """
                    </div>
                </div>
        """
    
    html_template += f"""
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
                    You received this email because you signed up for Fantasy League Chess.<br>
                    <a href="#" style="color: {accent_color};">Unsubscribe</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_template

def send_weekly_results_email(user_email, html_content):
    """Send the weekly results email"""
    
    subject = "📊 Your Fantasy League Chess Weekly Results"
    
    # Get environment variables
    sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
    from_email = 'no-reply@fantasyleaguechess.com'
    
    if not sendgrid_api_key:
        print("❌ Error: Missing SENDGRID_API_KEY environment variable")
        return False
    
    # Prepare the email payload
    payload = {
        "personalizations": [
            {
                "to": [{"email": user_email}],
                "subject": subject
            }
        ],
        "from": {"email": from_email, "name": "Fantasy League Chess"},
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
            print(f"✅ Weekly results email sent to {user_email}")
            return True
        else:
            print(f"❌ Failed to send email. Status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return False

def main():
    """Main function to send personalized weekly results emails"""
    
    # Test with a specific user
    user_email = "no-reply@fantasyleaguechess.com"
    
    print("🎯 Fantasy League Chess Weekly Results Email Generator")
    print("=" * 50)
    
    # Check environment variables
    if not os.getenv('SENDGRID_API_KEY'):
        print("❌ Error: Missing SENDGRID_API_KEY environment variable")
        print("Please set SENDGRID_API_KEY")
        return
    
    print(f"📧 Fetching data for: {user_email}")
    
    # Get user's leagues
    user_leagues = get_user_leagues(user_email)
    
    if not user_leagues:
        print("❌ No leagues found for this user")
        return
    
    print(f"✅ Found {len(user_leagues)} league(s)")
    
    # Process each league
    for league_member in user_leagues:
        league_data = league_member
        league_id = league_data['league_id']
        league_name = league_data['leagues']['name']
        
        print(f"\n🏆 Processing league: {league_name}")
        
        # Get the most recent week with results
        # For now, let's use a specific week (you can modify this logic)
        week_start_date = datetime(2025, 7, 21)  # Example week
        
        # Get lineup results for the week
        lineup_results = get_weekly_lineup_results(league_id, week_start_date.strftime("%Y-%m-%d"))
        
        if not lineup_results:
            print(f"⚠️ No lineup results found for week {week_start_date.strftime('%Y-%m-%d')}")
            continue
        
        print(f"✅ Found {len(lineup_results)} lineup(s) for the week")
        
        # Get user's team players
        user_id = league_member['user_id'] if 'user_id' in league_member else None
        if not user_id:
            # Get user ID from email
            user_response = supabase.table("users").select("id").eq("email", user_email).execute()
            if user_response.data:
                user_id = user_response.data[0]['id']
        
        team_players = get_user_team_players(user_id, league_id) if user_id else []
        print(f"✅ Found {len(team_players)} players in user's team")
        
        # Create personalized email
        html_content = create_weekly_results_email_html(user_email, league_data, lineup_results, team_players)
        
        if html_content:
            # Send the email
            success = send_weekly_results_email(user_email, html_content)
            if success:
                print(f"✅ Weekly results email sent for {league_name}")
            else:
                print(f"❌ Failed to send email for {league_name}")
        else:
            print(f"❌ Could not generate email content for {league_name}")

if __name__ == "__main__":
    main() 