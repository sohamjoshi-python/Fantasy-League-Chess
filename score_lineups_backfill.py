"""Score lineups using Monday lineups + Tuesday games (matches fixed migration logic)."""
from __future__ import annotations

from datetime import date, timedelta

from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()
sb = create_client(os.getenv("SB_URL"), os.getenv("SB_KEY"))


def tuesday_to_dotted(tuesday: date) -> str:
    return tuesday.strftime("%Y.%m.%d")


def score_lineup(lineup: dict, game_date_dotted: str) -> float:
    player_ids = lineup.get("player_ids") or []
    if not player_ids:
        return 0.0

    players = (
        sb.table("chess_players")
        .select("id,name")
        .in_("id", player_ids)
        .execute()
        .data
        or []
    )
    total = 0.0
    for player in players:
        name = player["name"]
        games = (
            sb.table("games")
            .select("white,black,white_points,black_points")
            .eq("date", game_date_dotted)
            .or_(f"white.ilike.{name},black.ilike.{name}")
            .execute()
            .data
            or []
        )
        for game in games:
            if game["white"].lower() == name.lower():
                total += float(game["white_points"] or 0)
            elif game["black"].lower() == name.lower():
                total += float(game["black_points"] or 0)
    return round(total, 2)


def process_tuesday(tuesday: date) -> None:
    dotted = tuesday_to_dotted(tuesday)
    monday = (tuesday - timedelta(days=1)).isoformat()
    tuesday_str = tuesday.isoformat()

    leagues = (
        sb.table("leagues")
        .select("id,name,start_date,end_date,member_ids")
        .lte("start_date", tuesday_str)
        .gte("end_date", tuesday_str)
        .execute()
        .data
        or []
    )

    print(f"\n=== {tuesday_str} (games.date={dotted}, lineups.week_start_date={monday}) ===")
    for league in leagues:
        lineups = (
            sb.table("lineups")
            .select("id,week_start_date,user_id,bot_id,player_ids,total_points")
            .eq("league_id", league["id"])
            .eq("week_start_date", monday)
            .execute()
            .data
            or []
        )
        if not lineups:
            print(f"  {league['name']}: no lineups for {monday}")
            continue

        for lineup in lineups:
            points = score_lineup(lineup, dotted)
            sb.table("lineups").update(
                {"total_points": points, "updated_at": "now()"}
            ).eq("id", lineup["id"]).execute()
            who = lineup.get("user_id") or lineup.get("bot_id")
            print(
                f"  {league['name']}: lineup {who} "
                f"{lineup['total_points']} -> {points} pts"
            )


if __name__ == "__main__":
    tuesdays = [date(2026, 5, 19), date(2026, 5, 26), date(2026, 6, 2)]
    for tuesday in tuesdays:
        process_tuesday(tuesday)
    print("\nDone.")
