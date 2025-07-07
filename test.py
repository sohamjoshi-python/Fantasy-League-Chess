import requests
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import os


load_dotenv()
url: str = os.getenv("SB_URL")
key: str = os.getenv("SB_KEY")
supabase: Client = create_client(url, key)

CHESSCOM_STATS_URL = "https://api.chess.com/pub/player/{username}/stats"
HEADERS = {
    # A polite User‑Agent helps you avoid 429 blocks
    "User-Agent": "blitz-fetcher/1.0 (contact: sohampjoshi@gmail.com)"
}


def get_blitz_elo(username: str, timeout: float = 5.0) -> Optional[int]:
    """
    Fetch the latest blitz rating for a Chess.com player.

    Parameters
    ----------
    username : str
        The player's Chess.com username (case‑insensitive).
    timeout : float, optional
        Seconds to wait for the server before aborting (default = 5).

    Returns
    -------
    int | None
        The player's current blitz Elo, or None if unavailable.

    Raises
    ------
    requests.HTTPError
        For non‑200 responses other than 404.
    requests.RequestException
        For network issues, timeouts, etc.
    """
    url = CHESSCOM_STATS_URL.format(username=username.lower())
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        if resp.status_code == 404:        # unknown user or no stats yet
            return None
        resp.raise_for_status()            # bubble up other HTTP errors

        data = resp.json()
        blitz_info = data.get("chess_blitz")
        if blitz_info and "last" in blitz_info:
            return blitz_info["last"]["rating"]
        return None                        # user has no blitz games recorded
    except requests.RequestException:
        # In a real app you might log the error here
        raise

def get_username():
    response = supabase.table("chess_players").select("name").execute().data
    response = [item['name'] for item in response]
    return response

def upload_to_supabase(name, elo):
    response = supabase.table("chess_players").update({"elo": elo}).match({"name": name}).execute()
    return response

names = get_username()

for name in names:
    elo = get_blitz_elo(name)  # Call the function with the username
    if elo is not None:  # Only update if we got a valid rating
        response = upload_to_supabase(name, elo)
        print(f"Updated {name}: {elo}")
    else:
        print(f"No rating found for {name}")