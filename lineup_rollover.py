"""Create the Monday lineup scoring expects when a manager did not save one.

Uses their latest non-empty lineup, keeping players still on the team.
If they never set a lineup, uses up to five players from the team.
"""
from __future__ import annotations

from datetime import date, timedelta

PAGE = 1000


def _monday(tuesday: date) -> str:
    return (tuesday - timedelta(days=1)).isoformat()


def _dotted(tuesday: date) -> str:
    return tuesday.strftime("%Y.%m.%d")


def choose_player_ids(team_ids: list[str], previous_lineups: list[dict], monday: str) -> list[str]:
    """previous_lineups are any weeks for this manager, newest last or unsorted."""
    team_set = set(team_ids or [])
    earlier = [
        row for row in previous_lineups
        if str(row.get("week_start_date") or "") < monday
        and row.get("player_ids")
    ]
    earlier.sort(key=lambda row: str(row["week_start_date"]), reverse=True)
    for row in earlier:
        kept = [pid for pid in row["player_ids"] if pid in team_set]
        if kept:
            return kept[:5]
    return list(team_ids or [])[:5]


def ensure_scoring_lineups(sb, tuesday: date) -> list[str]:
    """Insert missing lineup rows for this Titled Tuesday. Returns new lineup ids."""
    tuesday_str = tuesday.isoformat()
    monday = _monday(tuesday)
    leagues = (
        sb.table("leagues")
        .select("id,name,member_ids")
        .lte("start_date", tuesday_str)
        .gte("end_date", tuesday_str)
        .execute()
        .data
        or []
    )
    created: list[str] = []
    for league in leagues:
        member_ids = league.get("member_ids") or []
        if not member_ids:
            continue
        teams = (
            sb.table("teams")
            .select("user_id,player_ids")
            .eq("league_id", league["id"])
            .execute()
            .data
            or []
        )
        team_by_user = {
            team["user_id"]: team.get("player_ids") or []
            for team in teams
            if team.get("user_id")
        }
        existing = (
            sb.table("lineups")
            .select("id,user_id,week_start_date,player_ids")
            .eq("league_id", league["id"])
            .in_("user_id", member_ids)
            .execute()
            .data
            or []
        )
        by_user: dict[str, list[dict]] = {}
        has_monday: set[str] = set()
        for row in existing:
            user_id = row.get("user_id")
            if not user_id:
                continue
            by_user.setdefault(user_id, []).append(row)
            if str(row.get("week_start_date")) == monday:
                has_monday.add(user_id)

        for member_id in member_ids:
            if member_id in has_monday:
                continue
            player_ids = choose_player_ids(
                team_by_user.get(member_id) or [],
                by_user.get(member_id) or [],
                monday,
            )
            if not player_ids:
                continue
            inserted = (
                sb.table("lineups")
                .insert({
                    "user_id": member_id,
                    "league_id": league["id"],
                    "week_start_date": monday,
                    "player_ids": player_ids,
                    "total_points": 0,
                })
                .execute()
                .data
                or []
            )
            if inserted:
                created.append(inserted[0]["id"])
                print(
                    f"  Created lineup {league['name']} member {member_id} "
                    f"week {monday} ({len(player_ids)} players)"
                )
    return created


def _points_for_name(sb, game_date: str, name: str) -> float:
    total = 0.0
    for column, points_column in (("white", "white_points"), ("black", "black_points")):
        start = 0
        while True:
            batch = (
                sb.table("games")
                .select(points_column)
                .eq("date", game_date)
                .eq(column, name)
                .range(start, start + PAGE - 1)
                .execute()
                .data
                or []
            )
            for game in batch:
                total += float(game.get(points_column) or 0)
            if len(batch) < PAGE:
                break
            start += PAGE
    return total


def score_lineups(sb, tuesday: date, lineup_ids: list[str] | None = None) -> None:
    """Set total_points from that Tuesday's games. Optional id list limits the update."""
    monday = _monday(tuesday)
    game_date = _dotted(tuesday)
    query = (
        sb.table("lineups")
        .select("id,league_id,user_id,player_ids,total_points")
        .eq("week_start_date", monday)
    )
    if lineup_ids:
        query = query.in_("id", lineup_ids)
    lineups = query.execute().data or []
    for lineup in lineups:
        player_ids = lineup.get("player_ids") or []
        if not player_ids:
            points = 0.0
        else:
            players = (
                sb.table("chess_players")
                .select("name")
                .in_("id", player_ids)
                .execute()
                .data
                or []
            )
            points = round(sum(_points_for_name(sb, game_date, player["name"]) for player in players), 2)
        sb.table("lineups").update({
            "total_points": points,
            "updated_at": "now()",
        }).eq("id", lineup["id"]).execute()
        print(f"  Scored lineup {lineup['id']} -> {points}")
