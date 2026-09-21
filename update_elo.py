#!/usr/bin/env python3

import requests
import time
from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()
url: str = os.getenv("SB_URL")
# SB_KEY is the legacy service_role JWT, kept only until the legacy keys are
# disabled in the Supabase dashboard.
key: str = os.getenv("SB_SECRET_KEY") or os.getenv("SB_KEY")
supabase: Client = create_client(url, key)

def retry_operation(operation, max_retries=3, delay=1):
    """Retry a database operation with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return operation()
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            print(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}")
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            delay *= 2  # Exponential backoff

def get_chess_com_elo(username):
    """
    Fetch current ELO rating from Chess.com API for a given username.
    Returns the highest ELO rating among all time controls, or None if not found.
    """
    try:
        # Chess.com API endpoint for player stats
        url = f"https://api.chess.com/pub/player/{username}/stats"
        
        # Add proper headers with contact information for API access
        headers = {
            'User-Agent': f'FantasyChess/1.0 ({os.getenv("CHESSCOM_CONTACT_EMAIL", "contact@example.com")})',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        
        # Add delay to respect rate limits
        time.sleep(0.5)
        
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract ELO rating for blitz only
            if 'chess_blitz' in data and 'last' in data['chess_blitz']:
                rating = data['chess_blitz']['last']['rating']
                if rating and rating > 0:
                    return rating
                else:
                    print(f"  No valid blitz ELO rating found for {username}")
                    return None
            else:
                print(f"  No blitz rating data found for {username}")
                return None
                
        elif response.status_code == 404:
            print(f"  Player {username} not found on Chess.com")
            return None
        elif response.status_code == 403:
            print(f"  Access forbidden for {username} (403) - rate limited or blocked")
            return None
        elif response.status_code == 429:
            print(f"  Rate limited for {username} (429) - waiting longer...")
            time.sleep(5)  # Wait longer for rate limits
            return None
        else:
            print(f"  API request failed for {username}: {response.status_code}")
            print(f"  Response: {response.text[:200]}...")  # Show first 200 chars of response
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"  Network error for {username}: {e}")
        return None
    except Exception as e:
        print(f"  Unexpected error for {username}: {e}")
        return None

def update_player_elo(player_id, player_name, new_elo):
    """Update a player's ELO rating in the database."""
    try:
        response = retry_operation(lambda: supabase.table("chess_players").update({
            "elo": new_elo,
            "updated_at": "now()"
        }).eq("id", player_id).execute())
        
        if response.data:
            print(f"  Updated {player_name}: {new_elo}")
            return True
        else:
            print(f"  Failed to update {player_name}")
            return False
            
    except Exception as e:
        print(f"  Error updating {player_name}: {e}")
        return False

def test_api_connection():
    """Test if the Chess.com API is accessible."""
    print("Testing Chess.com API connection...")
    
    # Test with a well-known player
    test_username = "Hikaru"
    print(f"Testing with player: {test_username}")
    
    elo = get_chess_com_elo(test_username)
    if elo:
        print(f"✓ API is working! {test_username} has ELO: {elo}")
        return True
    else:
        print("✗ API test failed. The Chess.com API might be blocking requests.")
        print("This could be due to:")
        print("  - Rate limiting")
        print("  - IP blocking")
        print("  - API changes")
        print("  - Network issues")
        return False

def main():
    """Main function to update all player ELO ratings."""
    print("Starting ELO update process...")
    
    # Test API connection first
    if not test_api_connection():
        print("\nStopping update process due to API issues.")
        return
    
    try:
        # Fetch all players from the database
        print("Fetching players from database...")
        response = retry_operation(lambda: supabase.table("chess_players").select("*").execute())
        
        if not response.data:
            print("No players found in database")
            return
        
        players = response.data
        print(f"Found {len(players)} players to update")
        
        updated_count = 0
        failed_count = 0
        skipped_count = 0
        
        for i, player in enumerate(players, 1):
            player_id = player['id']
            player_name = player['name']
            current_elo = player['elo']
            
            print(f"\n[{i}/{len(players)}] Processing {player_name} (current ELO: {current_elo})")
            
            # Get current ELO from Chess.com
            new_elo = get_chess_com_elo(player_name)
            
            if new_elo is None:
                print(f"  Skipping {player_name} - could not fetch ELO")
                skipped_count += 1
                continue
            
            # Check if ELO has changed significantly (more than 10 points)
            if abs(new_elo - current_elo) <= 10:
                print(f"  ELO unchanged for {player_name} ({current_elo} -> {new_elo})")
                skipped_count += 1
                continue
            
            # Update the database
            if update_player_elo(player_id, player_name, new_elo):
                updated_count += 1
            else:
                failed_count += 1
            
            # Add delay between updates to avoid overwhelming the database and API
            time.sleep(1)
        
        print(f"\n=== ELO Update Summary ===")
        print(f"Total players processed: {len(players)}")
        print(f"Successfully updated: {updated_count}")
        print(f"Failed to update: {failed_count}")
        print(f"Skipped (no change/not found): {skipped_count}")
        
    except Exception as e:
        print(f"Error in main process: {e}")

if __name__ == "__main__":
    main()
