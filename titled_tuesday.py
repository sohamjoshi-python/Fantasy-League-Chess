import chess.engine
import chess.pgn
from engine_accuracy import acl_from_pgn, find_stockfish
import io
import re
import pandas as pd
import requests
from datetime import date, datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import math
import time
from fantasy_chess_scoring import acl_focused_scoring_individual_baseline

CHESS_COM_API = "https://api.chess.com/pub"
API_HEADERS = {"User-Agent": "FantasyChess/1.0 (sohampjoshi@gmail.com)"}
API_REQUEST_DELAY = 0.5

MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

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


def score_week_lineups(tuesday: date) -> None:
    """Update lineup totals for this Titled Tuesday (Monday lineups + Tuesday games)."""
    from datetime import timedelta

    tuesday_str = tuesday.isoformat()
    monday = tuesday - timedelta(days=1)
    print(
        f"Scoring lineups: process_weekly_results({tuesday_str}) "
        f"[games.date={tuesday.strftime('%Y.%m.%d')}, lineups.week_start_date={monday.isoformat()}]"
    )
    response = retry_operation(
        lambda: supabase.rpc("process_weekly_results", {"week_date": tuesday_str}).execute()
    )
    print(f"Lineup scoring completed for {tuesday_str}: {response}")


def parse_date(value):
    """Accept date, datetime, or YYYY-MM-DD / YYYY.MM.DD strings."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        normalized = value.strip().replace(".", "-")
        return datetime.strptime(normalized, "%Y-%m-%d").date()
    raise TypeError(f"Unsupported date type: {type(value)}")


def date_slug_fragments(target_date):
    """Chess.com slugs may use june-2-2026 or june-02-2026."""
    month = MONTH_NAMES[target_date.month - 1]
    year = target_date.year
    day = target_date.day
    return [
        f"{month}-{day}-{year}",
        f"{month}-{day:02d}-{year}",
    ]


def api_get(url):
    time.sleep(API_REQUEST_DELAY)
    response = requests.get(url, headers=API_HEADERS, timeout=30)
    response.raise_for_status()
    return response.json()


def is_main_titled_tuesday_slug(slug):
    slug = slug.lower()
    if "titled-tuesday" not in slug or "blitz" not in slug:
        return False
    excluded = ("masterclass", "qualifier", "grand-prix", "scc", "32-blitz")
    return not any(token in slug for token in excluded)


def _slug_matches_date(slug, fragments):
    slug_lower = slug.lower()
    return any(fragment in slug_lower for fragment in fragments)


def find_slugs_from_titled_tuesdays_page(target_date):
    """Scrape the official Titled Tuesdays index (most reliable for recent events)."""
    fragments = date_slug_fragments(target_date)
    response = requests.get(
        "https://www.chess.com/tournament/live/titled-tuesdays",
        headers=API_HEADERS,
        timeout=30,
    )
    response.raise_for_status()

    slugs = []
    seen = set()
    for match in re.findall(
        r"/tournament/live/([a-z0-9-]+titled-tuesday[a-z0-9-]+)",
        response.text,
        re.IGNORECASE,
    ):
        slug = match.lower()
        if not _slug_matches_date(slug, fragments) or not is_main_titled_tuesday_slug(slug):
            continue
        if slug not in seen:
            seen.add(slug)
            slugs.append(slug)

    return slugs


def find_slugs_from_player_tournaments(target_date, discovery_player):
    fragments = date_slug_fragments(target_date)
    data = api_get(f"{CHESS_COM_API}/player/{discovery_player}/tournaments")
    slugs = []
    seen = set()

    for section in ("finished", "in_progress", "registered"):
        for entry in data.get(section, []):
            api_url = entry.get("@id", "")
            if not api_url:
                continue
            slug = api_url.rstrip("/").split("/")[-1]
            if not _slug_matches_date(slug, fragments) or not is_main_titled_tuesday_slug(slug):
                continue
            if slug not in seen:
                seen.add(slug)
                slugs.append(slug)

    return slugs


def find_tournament_slugs(target_date, discovery_players=None):
    if discovery_players is None:
        discovery_players = [
            "hikaru",
            "fabianocaruana",
            "nihalsarin",
            "oleksandr_bortnyk",
            "denlaz",
        ]

    slugs = []
    seen = set()

    def add_slugs(found):
        for slug in found:
            if slug not in seen:
                seen.add(slug)
                slugs.append(slug)

    try:
        add_slugs(find_slugs_from_titled_tuesdays_page(target_date))
    except Exception as e:
        print(f"Warning: Could not scrape Titled Tuesdays page: {e}")

    for player in discovery_players:
        try:
            add_slugs(find_slugs_from_player_tournaments(target_date, player))
        except Exception as e:
            print(f"Warning: Could not load tournaments for {player}: {e}")
        if slugs:
            break

    return slugs


def _parse_elo_from_header(game, header_key):
    elo = game.headers.get(header_key, "2000")
    try:
        return int(elo) if elo != "?" else 2000
    except (ValueError, TypeError):
        return 2000


def _get_player_record(player_cache, name):
    if name in player_cache:
        return player_cache[name]

    response = retry_operation(
        lambda: supabase.table("chess_players").select("*").eq("name", name).execute()
    )
    record = response.data[0] if response.data else None
    player_cache[name] = record
    return record


def _update_player_accuracy(player_cache, name, game_acl, game, elo_header):
    """
    Mirror pgn_to_csv player updates using an in-memory cache.
    Returns the pre-update average ACL used for fantasy scoring.
    """
    record = _get_player_record(player_cache, name)

    if record is None:
        elo_int = _parse_elo_from_header(game, elo_header)
        new_record = {
            "name": name,
            "elo": elo_int,
            "accuracy": game_acl,
            "games": 1,
        }
        retry_operation(
            lambda: supabase.table("chess_players").insert(new_record).execute()
        )
        player_cache[name] = new_record
        print(f"  New player {name}: games = 1")
        return game_acl

    pre_update_avg = record.get("accuracy")
    current_games = record.get("games") or 0
    avg_for_fantasy = pre_update_avg if pre_update_avg is not None else game_acl

    print(f"  Player {name}: current games = {current_games}")
    if pre_update_avg is not None:
        new_avg = (current_games * pre_update_avg + game_acl) / (current_games + 1)
    else:
        new_avg = game_acl

    retry_operation(
        lambda: supabase.table("chess_players").update({
            "accuracy": new_avg,
            "games": current_games + 1,
            "updated_at": "now()",
        }).eq("name", name).execute()
    )
    record["accuracy"] = new_avg
    record["games"] = current_games + 1
    print(f"  Updated {name}: games = {current_games + 1}")
    return avg_for_fantasy


def iter_tournament_games(tournament_slug):
    """Yield chess.pgn.Game objects from all rounds/groups of a tournament."""
    tournament = api_get(f"{CHESS_COM_API}/tournament/{tournament_slug}")
    print(f"Tournament: {tournament.get('name', tournament_slug)} ({tournament.get('status', 'unknown')})")

    for round_url in tournament.get("rounds", []):
        round_data = api_get(round_url)
        for group_url in round_data.get("groups", []):
            group_data = api_get(group_url)
            for game_data in group_data.get("games", []):
                pgn_text = game_data.get("pgn")
                if not pgn_text:
                    continue
                game = chess.pgn.read_game(io.StringIO(pgn_text))
                if game is not None:
                    yield game


def convert(target_date, tournament_slug=None, tournament_slugs=None, discovery_players=None):
    parsed_date = parse_date(target_date)
    if tournament_slug:
        slugs = [tournament_slug]
    elif tournament_slugs:
        slugs = list(tournament_slugs)
    else:
        env_slugs = os.getenv("TT_TOURNAMENT_SLUGS", "").strip()
        if env_slugs:
            slugs = [s.strip() for s in env_slugs.split(",") if s.strip()]
        else:
            slugs = find_tournament_slugs(parsed_date, discovery_players=discovery_players)

    if not slugs:
        fragments = ", ".join(date_slug_fragments(parsed_date))
        raise ValueError(
            f"No Titled Tuesday tournaments found for {parsed_date.isoformat()} "
            f"(tried slug fragments: {fragments}). "
            "Pass tournament_slug explicitly, set TT_TOURNAMENT_SLUGS, or check "
            "https://www.chess.com/tournament/live/titled-tuesdays"
        )

    game_number = 0
    processed_games = set()  # Track processed games to avoid duplicates
    player_cache = {}
    game_rows = []

    engine_path = find_stockfish()
    if engine_path is None:
        print("Warning: Stockfish not found. ACL will not be calculated.")
        engine = None
    else:
        engine = chess.engine.SimpleEngine.popen_uci(engine_path)
        threads = max(1, min(4, (os.cpu_count() or 2)))
        engine.configure({"Threads": threads, "Hash": 128})
        print(f"Stockfish ready ({engine_path}, Threads={threads})")

    try:
        for slug in slugs:
            print(f"Fetching games from tournament: {slug}")
            for game in iter_tournament_games(slug):
                game_number += 1

                game_id = (
                    f"{game.headers.get('White', 'N/A')}_"
                    f"{game.headers.get('Black', 'N/A')}_"
                    f"{game.headers.get('Date', 'N/A')}_"
                    f"{game.headers.get('Round', 'N/A')}"
                )

                if game_id in processed_games:
                    print(f"Skipping duplicate game {game_number}: {game_id}")
                    continue

                processed_games.add(game_id)
                print(
                    f"Processing Game {game_number}: "
                    f"{game.headers.get('White', 'N/A')} vs {game.headers.get('Black', 'N/A')}"
                )

                event = game.headers.get('Event', 'N/A')
                white = game.headers.get('White', 'N/A')
                black = game.headers.get('Black', 'N/A')
                result = game.headers.get('Result', 'N/A')
                white_accuracy, black_accuracy = acl_from_pgn(game, engine=engine)
                round = game.headers.get('Round', 'N/A')
                # Always tag games with the Titled Tuesday we are ingesting (not PGN header),
                # so process_weekly_results(week_date) matches games.date (YYYY.MM.DD).
                date = parsed_date.strftime("%Y.%m.%d")
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
                    white_avg_accuracy = _update_player_accuracy(
                        player_cache, white, white_accuracy, game, "WhiteElo"
                    )
                    black_avg_accuracy = _update_player_accuracy(
                        player_cache, black, black_accuracy, game, "BlackElo"
                    )
                
                # Calculate fantasy points - handle None and NaN accuracy values
                if (white_accuracy is not None and black_accuracy is not None and 
                    not math.isnan(white_accuracy) and not math.isnan(black_accuracy)):
                    # Ensure we have valid accuracy values for fantasy points calculation
                    white_avg_for_fantasy = white_avg_accuracy if white_avg_accuracy is not None else white_accuracy
                    black_avg_for_fantasy = black_avg_accuracy if black_avg_accuracy is not None else black_accuracy
                    
                    white_elo_int = _parse_elo_from_header(game, "WhiteElo")
                    black_elo_int = _parse_elo_from_header(game, "BlackElo")

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
                    white_elo_int = _parse_elo_from_header(game, "WhiteElo")
                    black_elo_int = _parse_elo_from_header(game, "BlackElo")

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
                game_rows.append(new_row)
                print("White accuracy:", white_accuracy if white_accuracy is not None else "None (no moves played)")
                print("Black accuracy:", black_accuracy if black_accuracy is not None else "None (no moves played)")
                
                # Print fantasy points for each player
                print(f"FANTASY POINTS - Game {game_number}:")
                print(f"  {white} (ELO {white_elo_int}): {white_points:.2f} points")
                print(f"  {black} (ELO {black_elo_int}): {black_points:.2f} points")
                
                # Print detailed scoring breakdown if accuracy data is available
                if (white_accuracy is not None and black_accuracy is not None and 
                    not math.isnan(white_accuracy) and not math.isnan(black_accuracy)):
                    white_avg_for_fantasy = white_avg_accuracy if white_avg_accuracy is not None else white_accuracy
                    black_avg_for_fantasy = black_avg_accuracy if black_avg_accuracy is not None else black_accuracy
                    
                    print(f"  Scoring Details:")
                    print(f"    {white}: Game ACL {white_accuracy:.1f} vs Avg ACL {white_avg_for_fantasy:.1f} (Δ{white_avg_for_fantasy - white_accuracy:+.1f})")
                    print(f"    {black}: Game ACL {black_accuracy:.1f} vs Avg ACL {black_avg_for_fantasy:.1f} (Δ{black_avg_for_fantasy - black_accuracy:+.1f})")
                else:
                    print(f"  Scoring Details: No ACL data available")
                
                print("-" * 60)

        global games_df
        games_df = pd.DataFrame(game_rows, columns=games_df.columns)

    finally:
        if engine is not None:
            engine.quit()

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
        score_week_lineups(target_date)
        return response
    except Exception as e:
        print(f"Error inserting data into Supabase: {e}")
        print("DataFrame info:")
        print(games_df.info())
        print("\nFirst few rows with potential NaN values:")
        print(games_df.head())
        return None

if __name__ == "__main__":
    from datetime import date as _date
    convert(_date.today())
