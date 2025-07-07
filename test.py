import chess.pgn

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

            event = game.headers.get('Event', 'N/A')    
            early_late = "early" if "early" in event.lower() else "late"
            
            print(f"Processing Game {game_number}: early/late: {early_late}, Event: {event}")

convert("Early-Titled-Tuesday-Blitz-July-01-2025_2025-07-01-08-00.pgn")


