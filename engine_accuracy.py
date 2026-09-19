"""
engine_accuracy.py – compute (white_acl, black_acl) with local Stockfish
Comment out the call in titled_tuesday.py if you only want Chess.com tags.
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

def _parse_game(pgn_input):
  if isinstance(pgn_input, chess.pgn.Game):
    return pgn_input
  return chess.pgn.read_game(io.StringIO(pgn_input))


def _acl_with_engine(game, engine):
  board = chess.Board()
  white_losses = []
  black_losses = []
  move_count = 0

  for move in game.mainline_moves():
    move_count += 1
    try:
      info_before = engine.analyse(board, chess.engine.Limit(depth=8))
      score_before = info_before["score"].white()

      if score_before.is_mate():
        mate_moves = score_before.mate()
        if mate_moves > 0:
          eval_before = min(2000, 1500 + (10 - min(10, mate_moves)) * 50)
        else:
          eval_before = max(-2000, -1500 - (10 - min(10, abs(mate_moves))) * 50)
      else:
        eval_before = score_before.score()
        if eval_before is not None:
          eval_before = max(-2000, min(2000, eval_before))
        else:
          eval_before = 0

      board.push(move)

      info_after = engine.analyse(board, chess.engine.Limit(depth=8))
      score_after = info_after["score"].white()

      if score_after.is_mate():
        mate_moves = score_after.mate()
        if mate_moves > 0:
          eval_after = min(2000, 1500 + (10 - min(10, mate_moves)) * 50)
        else:
          eval_after = max(-2000, -1500 - (10 - min(10, abs(mate_moves))) * 50)
      else:
        eval_after = score_after.score()
        if eval_after is not None:
          eval_after = max(-2000, min(2000, eval_after))
        else:
          eval_after = 0

      if eval_before is not None and eval_after is not None:
        if move_count % 2 == 1:
          loss = max(0, eval_before - eval_after)
          loss = min(loss, 300)
          white_losses.append(loss)
        else:
          loss = max(0, eval_after - eval_before)
          loss = min(loss, 300)
          black_losses.append(loss)

    except Exception as e:
      print(f"Warning: Error analyzing move {move_count}: {e}")
      continue

  white_acpl = sum(white_losses) / len(white_losses) if white_losses else None
  black_acpl = sum(black_losses) / len(black_losses) if black_losses else None

  if white_acpl is not None:
    white_acpl = max(0, min(100, white_acpl))
  if black_acpl is not None:
    black_acpl = max(0, min(100, black_acpl))

  if len(white_losses) < 5 or len(black_losses) < 5:
    print(
      f"Warning: Few moves analyzed (White: {len(white_losses)}, Black: {len(black_losses)}). "
      "No accuracy calculated."
    )
    return None, None

  return white_acpl, black_acpl


def acl_from_pgn(pgn_input, engine_path=None, engine=None):
  """
  Calculates the average centipawn loss for White and Black from PGN input.

  Args:
      pgn_input: Either a chess.pgn.Game object or a PGN text string.
      engine_path (str): The path to the UCI chess engine executable (e.g., "stockfish").
      engine: Optional open SimpleEngine instance to reuse across games (much faster).

  Returns:
      tuple: A tuple containing (white_acpl, black_acpl).
  """
  game = _parse_game(pgn_input)
  if game is None:
    print("Warning: Could not parse game. No accuracy calculated.")
    return None, None

  try:
    if engine is not None:
      return _acl_with_engine(game, engine)

    if engine_path is None:
      engine_path = find_stockfish()

    if engine_path is None:
      print("Warning: Stockfish not found. No accuracy calculated.")
      return None, None

    with chess.engine.SimpleEngine.popen_uci(engine_path) as owned_engine:
      owned_engine.configure({"Threads": 1, "Hash": 64})
      return _acl_with_engine(game, owned_engine)

  except Exception as e:
    print(f"Error in engine analysis: {e}")
    return None, None

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