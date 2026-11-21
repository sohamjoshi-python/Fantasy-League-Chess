#!/usr/bin/env python3
"""
Store each player's Titled Tuesday history from Chess.com: every event they entered with
their final place, plus career totals on chess_players.

    python sync_tt_career_stats.py --all              # every player (first backfill)
    python sync_tt_career_stats.py --all --missing    # resume: only players never synced
    python sync_tt_career_stats.py --date 2026-11-17  # players who played that Tuesday
    python sync_tt_career_stats.py --names hikaru,nihalsarin

chess_players.games is left alone; it is the sample size behind the ACL average.
"""

import argparse
import os
import re
import time
from datetime import date, datetime, timezone

import requests

CHESS_COM_API = "https://api.chess.com/pub"
REQUEST_DELAY = 0.3
PAGE_SIZE = 1000
NAME_CHUNK = 100

MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]
SLUG_DATE = re.compile(r"(" + "|".join(MONTH_NAMES) + r")-(\d{1,2})-(\d{4})")


def is_main_titled_tuesday_slug(slug):
    slug = slug.lower()
    if "titled-tuesday" not in slug or "blitz" not in slug:
        return False
    excluded = ("masterclass", "qualifier", "grand-prix", "scc", "32-blitz")
    return not any(token in slug for token in excluded)


def session_from_slug(slug):
    slug = slug.lower()
    if slug.startswith("early-") or "-early" in slug or slug.endswith("-am"):
        return "early"
    if slug.startswith("late-") or "-late" in slug:
        return "late"
    return None


def date_from_slug(slug):
    match = SLUG_DATE.search(slug.lower())
    if not match:
        return None
    month, day, year = match.groups()
    try:
        return date(int(year), MONTH_NAMES.index(month) + 1, int(day))
    except ValueError:
        return None


def _headers():
    contact = os.getenv("CHESSCOM_CONTACT_EMAIL", "contact@example.com")
    return {"User-Agent": f"FantasyChess/1.0 ({contact})", "Accept": "application/json"}


def fetch_json(path):
    """GET a Chess.com API path; None when the account or event is gone."""
    url = f"{CHESS_COM_API}/{path}"
    for attempt in range(4):
        time.sleep(REQUEST_DELAY)
        try:
            response = requests.get(url, headers=_headers(), timeout=30)
        except requests.RequestException as error:
            print(f"  network error for {path}: {error}")
            time.sleep(2 * (attempt + 1))
            continue
        if response.status_code == 200:
            return response.json()
        if response.status_code in (404, 410):
            return None
        if response.status_code == 429:
            time.sleep(10 * (attempt + 1))
            continue
        print(f"  {path}: HTTP {response.status_code}")
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Chess.com did not answer for {path}")


def titled_tuesday_entries(tournaments):
    entries = {}
    for entry in tournaments.get("finished", []):
        link = (entry.get("url") or entry.get("@id") or "").rstrip("/")
        slug = link.split("/")[-1]
        if slug and slug not in entries and is_main_titled_tuesday_slug(slug):
            entries[slug] = entry
    return entries


def career_totals(entries):
    totals = {
        "tt_career_events": len(entries),
        "tt_career_games": 0,
        "tt_career_wins": 0,
        "tt_career_draws": 0,
        "tt_career_losses": 0,
        "tt_best_finish": None,
        "tt_event_wins": 0,
    }
    for entry in entries.values():
        wins = int(entry.get("wins") or 0)
        draws = int(entry.get("draws") or 0)
        losses = int(entry.get("losses") or 0)
        totals["tt_career_games"] += wins + draws + losses
        totals["tt_career_wins"] += wins
        totals["tt_career_draws"] += draws
        totals["tt_career_losses"] += losses
        placement = entry.get("placement")
        if isinstance(placement, int) and placement > 0:
            if totals["tt_best_finish"] is None or placement < totals["tt_best_finish"]:
                totals["tt_best_finish"] = placement
            if placement == 1:
                totals["tt_event_wins"] += 1
    return totals


def event_row(slug, entry):
    details = fetch_json(f"tournament/{slug}") or {}
    started = details.get("start_time") or details.get("finish_time")
    starts_at = datetime.fromtimestamp(started, tz=timezone.utc) if started else None
    event_date = starts_at.date() if starts_at else date_from_slug(slug)
    return {
        "slug": slug,
        "name": details.get("name"),
        "session": session_from_slug(slug),
        "starts_at": starts_at.isoformat() if starts_at else None,
        "event_date": event_date.isoformat() if event_date else None,
        "total_rounds": (details.get("settings") or {}).get("total_rounds"),
        "url": entry.get("url") or f"https://www.chess.com/tournament/live/{slug}",
    }


def known_events(sb):
    events = {}
    page = 0
    while True:
        rows = (
            sb.table("titled_tuesday_events")
            .select("slug,event_date,starts_at,session")
            .order("slug")
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
            .execute()
            .data
            or []
        )
        events.update((row["slug"], row) for row in rows)
        if len(rows) < PAGE_SIZE:
            return events
        page += 1


def label_sessions(sb, events, event_date):
    """Newer slugs don't say early or late; on a two-event Tuesday the earlier start is early."""
    same_day = sorted(
        (row for row in events.values() if row.get("event_date") == event_date and row.get("starts_at")),
        key=lambda row: row["starts_at"],
    )
    if len(same_day) < 2:
        return
    for row, session in ((same_day[0], "early"), (same_day[-1], "late")):
        if row.get("session") != session:
            sb.table("titled_tuesday_events").update({"session": session}).eq("slug", row["slug"]).execute()
            row["session"] = session


def sync_player(sb, player, events):
    now = datetime.now(timezone.utc).isoformat()
    tournaments = fetch_json(f"player/{player['name'].lower()}/tournaments")
    if tournaments is None:
        sb.table("chess_players").update({"tt_career_synced_at": now}).eq("id", player["id"]).execute()
        return False

    entries = titled_tuesday_entries(tournaments)
    for slug, entry in entries.items():
        if slug in events:
            continue
        row = event_row(slug, entry)
        sb.table("titled_tuesday_events").upsert(row, on_conflict="slug").execute()
        events[slug] = row
        if row["event_date"]:
            label_sessions(sb, events, row["event_date"])

    results = [
        {
            "player_id": player["id"],
            "event_slug": slug,
            "placement": entry.get("placement"),
            "total_players": entry.get("total_players"),
            "wins": int(entry.get("wins") or 0),
            "draws": int(entry.get("draws") or 0),
            "losses": int(entry.get("losses") or 0),
            "status": entry.get("status"),
            "updated_at": now,
        }
        for slug, entry in entries.items()
    ]
    for start in range(0, len(results), 500):
        sb.table("titled_tuesday_results").upsert(
            results[start:start + 500], on_conflict="player_id,event_slug"
        ).execute()

    row = career_totals(entries)
    row["tt_career_synced_at"] = now
    sb.table("chess_players").update(row).eq("id", player["id"]).execute()
    return True


def sync_players(sb, players):
    events = known_events(sb)
    for event_date in sorted({row["event_date"] for row in events.values() if row.get("event_date")}):
        label_sessions(sb, events, event_date)
    updated = missing = failed = 0
    for index, player in enumerate(players, 1):
        try:
            if sync_player(sb, player, events):
                updated += 1
            else:
                missing += 1
        except Exception as error:
            failed += 1
            print(f"  {player['name']}: {error}")
        if index % 100 == 0 or index == len(players):
            print(
                f"[{index}/{len(players)}] updated {updated}, no Chess.com account {missing}, "
                f"failed {failed}, events known {len(events)}"
            )
    return updated, missing, failed


def all_players(sb, missing_only):
    players = []
    page = 0
    while True:
        query = sb.table("chess_players").select("id,name").order("id")
        if missing_only:
            query = query.is_("tt_career_synced_at", "null")
        rows = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1).execute().data or []
        players.extend(rows)
        if len(rows) < PAGE_SIZE:
            return players
        page += 1


def players_named(sb, names):
    players = []
    unique = sorted(set(names))
    for start in range(0, len(unique), NAME_CHUNK):
        chunk = unique[start:start + NAME_CHUNK]
        players.extend(sb.table("chess_players").select("id,name").in_("name", chunk).execute().data or [])
    return players


def names_for_tuesday(sb, tuesday):
    names = set()
    for stored_date in (tuesday.strftime("%Y.%m.%d"), tuesday.isoformat()):
        page = 0
        while True:
            rows = (
                sb.table("games")
                .select("white,black")
                .eq("date", stored_date)
                .order("id")
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
                .execute()
                .data
                or []
            )
            for row in rows:
                names.update(name for name in (row.get("white"), row.get("black")) if name)
            if len(rows) < PAGE_SIZE:
                break
            page += 1
    return names


def main():
    from dotenv import load_dotenv
    from supabase import create_client

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true")
    group.add_argument("--date", help="Titled Tuesday date, YYYY-MM-DD")
    group.add_argument("--names", help="Comma-separated player names")
    parser.add_argument("--missing", action="store_true", help="With --all, skip players already synced")
    args = parser.parse_args()

    load_dotenv()
    sb = create_client(os.environ["SB_URL"], os.getenv("SB_SECRET_KEY") or os.environ["SB_KEY"])

    if args.all:
        players = all_players(sb, args.missing)
    elif args.date:
        tuesday = date.fromisoformat(args.date.replace(".", "-"))
        players = players_named(sb, names_for_tuesday(sb, tuesday))
    else:
        players = players_named(sb, [name.strip() for name in args.names.split(",") if name.strip()])

    print(f"Syncing Titled Tuesday history for {len(players)} players")
    updated, missing, failed = sync_players(sb, players)
    print(f"Done: updated {updated}, no Chess.com account {missing}, failed {failed}")


if __name__ == "__main__":
    main()
