import chess.pgn
from engine_accuracy import acl_from_pgn
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import math
import time
from fantasy_chess_scoring import acl_focused_scoring_individual_baseline

load_dotenv()
url: str = os.getenv("SB_URL")
key: str = os.getenv("SB_KEY")
supabase: Client = create_client(url, key)

games_df = pd.DataFrame(columns = ["early_late", "date", "white", "black", "result", "white_accuracy", "black_accuracy", "round", "white_points", "black_points"])

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

def convert(pgn_file):
    with open(pgn_file, encoding="utf-8") as pgn:
        game_number = 0
        processed_games = set()  # Track processed games to avoid duplicates
        
        while True:
            game = chess.pgn.read_game(pgn)
            if game is None:
                break  # End of file reached

            game_number += 1
            
            # Create a unique identifier for this game to check for duplicates
            game_id = f"{game.headers.get('White', 'N/A')}_{game.headers.get('Black', 'N/A')}_{game.headers.get('Date', 'N/A')}_{game.headers.get('Round', 'N/A')}"
            
            if game_id in processed_games:
                print(f"Skipping duplicate game {game_number}: {game_id}")
                continue
                
            processed_games.add(game_id)
            print(f"Processing Game {game_number}: {game.headers.get('White', 'N/A')} vs {game.headers.get('Black', 'N/A')}")

            # Access game information (e.g., headers)
            event = game.headers.get('Event', 'N/A')
            white = game.headers.get('White', 'N/A')
            black = game.headers.get('Black', 'N/A')
            result = game.headers.get('Result', 'N/A')
            white_accuracy, black_accuracy = acl_from_pgn(game)
            round = game.headers.get('Round', 'N/A')
            date = game.headers.get('Date', 'N/A')
            early_late = "early" if "early" in event.lower() else "late"
            
            # Handle cases where accuracy calculation failed (no moves played, etc.)
            if (white_accuracy is None or black_accuracy is None or 
                math.isnan(white_accuracy) or math.isnan(black_accuracy)):
                print(f"Warning: Accuracy calculation failed for game {game_number}. Skipping accuracy-based updates.")
                # Set accuracy to None for database storage
                white_accuracy = None
                black_accuracy = None
                white_avg_accuracy = None
                black_avg_accuracy = None
            else:
                # Only update player accuracy if we have valid accuracy values
                response_w = retry_operation(lambda: supabase.table("chess_players").select("*").eq("name", white).execute())
                response_b = retry_operation(lambda: supabase.table("chess_players").select("*").eq("name", black).execute())
                
                # Handle white player accuracy
                if response_w.data:
                    white_avg_accuracy = response_w.data[0]['accuracy']
                    current_games = response_w.data[0]['games'] or 0
                    print(f"  White player {white}: current games = {current_games}")
                    if white_avg_accuracy is not None:
                        new_white_accuracy = (current_games * white_avg_accuracy + white_accuracy) / (current_games + 1)
                        response = retry_operation(lambda: supabase.table("chess_players").update({
                            "accuracy": new_white_accuracy, 
                            "games": current_games + 1,
                            "updated_at": "now()"
                        }).eq("name", white).execute())
                        print(f"  Updated {white}: games = {current_games + 1}")
                    else:
                        # If accuracy is None, just use current game accuracy
                        response = retry_operation(lambda: supabase.table("chess_players").update({
                            "accuracy": white_accuracy, 
                            "games": current_games + 1,
                            "updated_at": "now()"
                        }).eq("name", white).execute())
                        print(f"  Updated {white}: games = {current_games + 1}")
                else:
                    white_avg_accuracy = white_accuracy
                    # Get ELO from game headers or use default
                    white_elo = game.headers.get('WhiteElo', '2000')
                    try:
                        white_elo_int = int(white_elo) if white_elo != '?' else 2000
                    except (ValueError, TypeError):
                        white_elo_int = 2000
                    
                    response = retry_operation(lambda: supabase.table("chess_players").insert({
                        "name": white, 
                        "elo": white_elo_int,
                        "accuracy": white_avg_accuracy, 
                        "games": 1
                    }).execute())
                    print(f"  New player {white}: games = 1")
                
                # Handle black player accuracy
                if response_b.data:
                    black_avg_accuracy = response_b.data[0]['accuracy']
                    current_games = response_b.data[0]['games'] or 0
                    print(f"  Black player {black}: current games = {current_games}")
                    if black_avg_accuracy is not None:
                        new_black_accuracy = (current_games * black_avg_accuracy + black_accuracy) / (current_games + 1)
                        response = retry_operation(lambda: supabase.table("chess_players").update({
                            "accuracy": new_black_accuracy, 
                            "games": current_games + 1,
                            "updated_at": "now()"
                        }).eq("name", black).execute())
                        print(f"  Updated {black}: games = {current_games + 1}")
                    else:
                        # If accuracy is None, just use current game accuracy
                        response = retry_operation(lambda: supabase.table("chess_players").update({
                            "accuracy": black_accuracy, 
                            "games": current_games + 1,
                            "updated_at": "now()"
                        }).eq("name", black).execute())
                        print(f"  Updated {black}: games = {current_games + 1}")
                else:
                    black_avg_accuracy = black_accuracy
                    # Get ELO from game headers or use default
                    black_elo = game.headers.get('BlackElo', '2000')
                    try:
                        black_elo_int = int(black_elo) if black_elo != '?' else 2000
                    except (ValueError, TypeError):
                        black_elo_int = 2000
                    
                    response = retry_operation(lambda: supabase.table("chess_players").insert({
                        "name": black, 
                        "elo": black_elo_int,
                        "accuracy": black_avg_accuracy, 
                        "games": 1
                    }).execute())
                    print(f"  New player {black}: games = 1")
            
            # Calculate fantasy points - handle None and NaN accuracy values
            if (white_accuracy is not None and black_accuracy is not None and 
                not math.isnan(white_accuracy) and not math.isnan(black_accuracy)):
                # Ensure we have valid accuracy values for fantasy points calculation
                white_avg_for_fantasy = white_avg_accuracy if white_avg_accuracy is not None else white_accuracy
                black_avg_for_fantasy = black_avg_accuracy if black_avg_accuracy is not None else black_accuracy
                
                # Safety check for ELO values
                white_elo = game.headers.get('WhiteElo', '2000')
                black_elo = game.headers.get('BlackElo', '2000')
                
                try:
                    white_elo_int = int(white_elo) if white_elo != '?' else 2000
                    black_elo_int = int(black_elo) if black_elo != '?' else 2000
                except (ValueError, TypeError):
                    white_elo_int = 2000
                    black_elo_int = 2000
                
                white_points = acl_focused_scoring_individual_baseline(
                    player_elo=white_elo_int,
                    opponent_elo=black_elo_int,
                    result=1.0 if result == "1-0" else 0.5 if result == "1/2-1/2" else 0.0,
                    player_game_acl=white_accuracy,
                    player_avg_acl=white_avg_for_fantasy
                )
                black_points = acl_focused_scoring_individual_baseline(
                    player_elo=black_elo_int,
                    opponent_elo=white_elo_int,
                    result=1.0 if result == "0-1" else 0.5 if result == "1/2-1/2" else 0.0,
                    player_game_acl=black_accuracy,
                    player_avg_acl=black_avg_for_fantasy
                )
            else:
                # If no accuracy available, calculate fantasy points without accuracy component
                # Safety check for ELO values
                white_elo = game.headers.get('WhiteElo', '2000')
                black_elo = game.headers.get('BlackElo', '2000')
                
                try:
                    white_elo_int = int(white_elo) if white_elo != '?' else 2000
                    black_elo_int = int(black_elo) if black_elo != '?' else 2000
                except (ValueError, TypeError):
                    white_elo_int = 2000
                    black_elo_int = 2000
                
                white_points = acl_focused_scoring_individual_baseline(
                    player_elo=white_elo_int,
                    opponent_elo=black_elo_int,
                    result=1.0 if result == "1-0" else 0.5 if result == "1/2-1/2" else 0.0,
                    player_game_acl=0,  # Use 0 to indicate no accuracy penalty/bonus
                    player_avg_acl=0
                )
                black_points = acl_focused_scoring_individual_baseline(
                    player_elo=black_elo_int,
                    opponent_elo=white_elo_int,
                    result=1.0 if result == "0-1" else 0.5 if result == "1/2-1/2" else 0.0,
                    player_game_acl=0,  # Use 0 to indicate no accuracy penalty/bonus
                    player_avg_acl=0
                )
            
            # Final safety check to ensure no NaN values are stored
            if white_accuracy is not None and math.isnan(white_accuracy):
                white_accuracy = None
            if black_accuracy is not None and math.isnan(black_accuracy):
                black_accuracy = None
            
            new_row = {
                "early_late": early_late,
                "date": date,
                "white": white,
                "black": black,
                "result": result,
                "white_accuracy": white_accuracy,
                "black_accuracy": black_accuracy,
                "round": round,
                "white_points": white_points,
                "black_points": black_points
            }
            new_row_df = pd.DataFrame([new_row])
            global games_df
            games_df = pd.concat([games_df, new_row_df], ignore_index=True)
            print("White accuracy:", white_accuracy if white_accuracy is not None else "None (no moves played)")
            print("Black accuracy:", black_accuracy if black_accuracy is not None else "None (no moves played)")
            
            # Print fantasy points for each player
            print(f"🎯 FANTASY POINTS - Game {game_number}:")
            print(f"  {white} (ELO {white_elo_int}): {white_points:.2f} points")
            print(f"  {black} (ELO {black_elo_int}): {black_points:.2f} points")
            
            # Print detailed scoring breakdown if accuracy data is available
            if (white_accuracy is not None and black_accuracy is not None and 
                not math.isnan(white_accuracy) and not math.isnan(black_accuracy)):
                white_avg_for_fantasy = white_avg_accuracy if white_avg_accuracy is not None else white_accuracy
                black_avg_for_fantasy = black_avg_accuracy if black_avg_accuracy is not None else black_accuracy
                
                print(f"  📊 Scoring Details:")
                print(f"    {white}: Game ACL {white_accuracy:.1f} vs Avg ACL {white_avg_for_fantasy:.1f} (Δ{white_avg_for_fantasy - white_accuracy:+.1f})")
                print(f"    {black}: Game ACL {black_accuracy:.1f} vs Avg ACL {black_avg_for_fantasy:.1f} (Δ{black_avg_for_fantasy - black_accuracy:+.1f})")
            else:
                print(f"  📊 Scoring Details: No ACL data available")
            
            print("-" * 60)
            
            # Small delay to avoid overwhelming the database
            time.sleep(0.001)
        
        try:
            # Clean NaN values from the DataFrame before inserting
            print("Cleaning NaN values from DataFrame...")
            games_df_clean = games_df.copy()
            
            # Replace NaN values with None for all numeric columns
            numeric_columns = ['white_accuracy', 'black_accuracy', 'white_points', 'black_points']
            for col in numeric_columns:
                if col in games_df_clean.columns:
                    games_df_clean[col] = games_df_clean[col].replace([float('nan'), float('inf'), float('-inf')], None)
            
            # Check for any remaining NaN values
            nan_count = games_df_clean.isna().sum().sum()
            if nan_count > 0:
                print(f"Warning: {nan_count} NaN values still present in DataFrame")
                print("NaN values by column:")
                for col in games_df_clean.columns:
                    nan_in_col = games_df_clean[col].isna().sum()
                    if nan_in_col > 0:
                        print(f"  {col}: {nan_in_col} NaN values")
            
            # Convert to records and clean any remaining NaN values
            records = games_df_clean.to_dict(orient='records')
            for record in records:
                for key, value in record.items():
                    if isinstance(value, float) and math.isnan(value):
                        record[key] = None
            
            response = retry_operation(lambda: supabase.table("games").insert(records).execute())
            print(f"Successfully inserted {len(records)} games into Supabase")
            return response
        except Exception as e:
            print(f"Error inserting data into Supabase: {e}")
            print("DataFrame info:")
            print(games_df.info())
            print("\nFirst few rows with potential NaN values:")
            print(games_df.head())
            return None

#Completed: 
#convert("Late-Titled-Tuesday-Blitz-July-08-2025_2025-07-08-13-00.pgn")  
#convert("Late-Titled-Tuesday-Blitz-July-15-2025_2025-07-15-13-00.pgn")
#convert("Late-Titled-Tuesday-Blitz-July-22-2025_2025-07-22-13-00.pgn")
#convert("Early-Titled-Tuesday-Blitz-July-22-2025_2025-07-22-08-00.pgn")
#convert("Late-Titled-Tuesday-Blitz-June-24-2025_2025-06-24-13-00 (2).pgn")
#convert("Early-Titled-Tuesday-Blitz-August-05-2025_2025-08-05-08-00.pgn")
#convert("Late-Titled-Tuesday-Blitz-August-05-2025_2025-08-05-13-00.pgn")
convert("Early-Titled-Tuesday-Blitz-August-12-2025_2025-08-12-08-00.pgn")
convert("Late-Titled-Tuesday-Blitz-August-12-2025_2025-08-12-13-00.pgn")