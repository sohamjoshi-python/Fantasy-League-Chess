"""
engine_accuracy.py – compute (white_acl, black_acl) with local Stockfish
Comment out the call in titled_tuesday_games.py if you only want Chess.com tags.
"""
import chess.engine
import chess.pgn
import io
import os
import sys

# Try multiple possible Stockfish paths
STOCKFISH_PATHS = [
    r"C:\Program Files\ChessEngines\stockfish_17\stockfish-windows-x86-64-avx2.exe",
    r"C:\Program Files\ChessEngines\stockfish\stockfish.exe",
    "stockfish",  # If it's in PATH
    "stockfish_17",  # Alternative name
]

def find_stockfish():
    """Find a working Stockfish executable."""
    for path in STOCKFISH_PATHS:
        if os.path.exists(path):
            return path
        # Try to run from PATH
        try:
            import subprocess
            result = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return path
        except:
            continue
    return None

def acl_from_pgn(pgn_input, engine_path=None):
    """
    Calculates the average centipawn loss for White and Black from PGN input.

    Args:
        pgn_input: Either a chess.pgn.Game object or a PGN text string.
        engine_path (str): The path to the UCI chess engine executable (e.g., "stockfish").

    Returns:
        tuple: A tuple containing (white_acpl, black_acpl).
    """
    # Find Stockfish if not provided
    if engine_path is None:
        engine_path = find_stockfish()
    
    if engine_path is None:
        print("Warning: Stockfish not found. No accuracy calculated.")
        return None, None  # Return None to indicate no analysis possible
    
    try:
        # Use the synchronous SimpleEngine interface
        with chess.engine.SimpleEngine.popen_uci(engine_path) as engine:
            # Configure engine for speed
            engine.configure({"Threads": 1, "Hash": 64})
            board = chess.Board()

            # Handle both Game objects and PGN text strings
            if isinstance(pgn_input, chess.pgn.Game):
                game = pgn_input
            else:
                # Assume it's a PGN text string
                game = chess.pgn.read_game(io.StringIO(pgn_input))

            if game is None:
                print("Warning: Could not parse game. No accuracy calculated.")
                return None, None

            white_losses = []
            black_losses = []
            move_count = 0

            for move in game.mainline_moves():
                move_count += 1
                try:
                    # Get evaluation BEFORE the move (use depth instead of time for speed)
                    info_before = engine.analyse(board, chess.engine.Limit(depth=8))
                    score_before = info_before["score"].white()

                    # Convert mate scores to reasonable centipawn values
                    if score_before.is_mate():
                        mate_moves = score_before.mate()
                        # Cap mate scores at reasonable values (closer mates = higher value)
                        if mate_moves > 0:
                            eval_before = min(2000, 1500 + (10 - min(10, mate_moves)) * 50)
                        else:
                            eval_before = max(-2000, -1500 - (10 - min(10, abs(mate_moves))) * 50)
                    else:
                        eval_before = score_before.score()
                        # Cap regular evaluations to prevent extreme values
                        if eval_before is not None:
                            eval_before = max(-2000, min(2000, eval_before))
                        else:
                            eval_before = 0

                    # Make the move
                    board.push(move)

                    # Get evaluation AFTER the move (use depth instead of time for speed)
                    info_after = engine.analyse(board, chess.engine.Limit(depth=8))
                    score_after = info_after["score"].white()

                    # Convert mate scores to reasonable centipawn values
                    if score_after.is_mate():
                        mate_moves = score_after.mate()
                        # Cap mate scores at reasonable values
                        if mate_moves > 0:
                            eval_after = min(2000, 1500 + (10 - min(10, mate_moves)) * 50)
                        else:
                            eval_after = max(-2000, -1500 - (10 - min(10, abs(mate_moves))) * 50)
                    else:
                        eval_after = score_after.score()
                        # Cap regular evaluations to prevent extreme values
                        if eval_after is not None:
                            eval_after = max(-2000, min(2000, eval_after))
                        else:
                            eval_after = 0

                    # Calculate centipawn loss with reasonable caps
                    if eval_before is not None and eval_after is not None:
                        # Determine which player made this move
                        # move_count starts at 1, so odd moves are White, even moves are Black
                        if move_count % 2 == 1:  # White's move
                            loss = max(0, eval_before - eval_after)
                            # Cap individual move losses to prevent outliers
                            loss = min(loss, 300)
                            white_losses.append(loss)
                        else:  # Black's move
                            loss = max(0, eval_after - eval_before)
                            # Cap individual move losses to prevent outliers
                            loss = min(loss, 300)
                            black_losses.append(loss)

                except Exception as e:
                    print(f"Warning: Error analyzing move {move_count}: {e}")
                    continue

            # Calculate average centipawn loss
            white_acpl = sum(white_losses) / len(white_losses) if white_losses else None
            black_acpl = sum(black_losses) / len(black_losses) if black_losses else None

            # Ensure reasonable bounds (only if we have valid values)
            if white_acpl is not None:
                white_acpl = max(0, min(100, white_acpl))
            if black_acpl is not None:
                black_acpl = max(0, min(100, black_acpl))

            # If we have very few moves analyzed, return None to indicate no meaningful analysis
            if len(white_losses) < 5 or len(black_losses) < 5:
                print(f"Warning: Few moves analyzed (White: {len(white_losses)}, Black: {len(black_losses)}). No accuracy calculated.")
                return None, None

            return white_acpl, black_acpl

    except Exception as e:
        print(f"Error in engine analysis: {e}")
        return None, None  # Return None to indicate no analysis possible

# Backward compatibility function for PGN text strings
def acl_from_pgn_text(pgn_text, engine_path=None):
    """
    Legacy function for backward compatibility.
    Calculates the average centipawn loss for White and Black from PGN text.
    
    Args:
        pgn_text (str): The PGN string of the chess game.
        engine_path (str): The path to the UCI chess engine executable.
    
    Returns:
        tuple: A tuple containing (white_acpl, black_acpl).
    """
    return acl_from_pgn(pgn_text, engine_path)