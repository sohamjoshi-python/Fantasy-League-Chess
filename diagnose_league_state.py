from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()
sb = create_client(os.getenv("SB_URL"), os.getenv("SB_KEY"))

leagues = (
    sb.table("leagues")
    .select("id,name,join_code,start_date,end_date,created_at,draft_completed,member_ids")
    .order("created_at", desc=True)
    .limit(8)
    .execute()
)

print("=== RECENT LEAGUES ===")
for league in leagues.data or []:
    ended = league["end_date"] < "2026-06-04"
    bad_end = league["end_date"] < league["start_date"]
    print(
        f"{league['name']!r} | join={league['join_code']} | "
        f"start={league['start_date']} end={league['end_date']} | "
        f"ended={ended} end_before_start={bad_end} | id={league['id']}"
    )

print("\n=== GAME COUNTS ===")
for d in ["2026.05.19", "2026.05.26", "2026.06.02"]:
    g = sb.table("games").select("id", count="exact").eq("date", d).execute()
    print(f"  {d}: {g.count}")

for league in (leagues.data or [])[:3]:
    lid = league["id"]
    name = league["name"]
    print(f"\n=== LINEUPS: {name} ({lid}) ===")
    lu = (
        sb.table("lineups")
        .select("week_start_date,total_points,user_id,bot_id")
        .eq("league_id", lid)
        .order("week_start_date")
        .execute()
    )
    rows = lu.data or []
    if not rows:
        print("  (none)")
    for row in rows:
        print(f"  {row['week_start_date']} pts={row['total_points']} user={row.get('user_id')} bot={row.get('bot_id')}")
    print(f"  total={len(rows)}")

    members = league.get("member_ids") or []
    if members:
        uid = members[0]
        teams = (
            sb.table("teams")
            .select("id,user_id,player_ids")
            .eq("league_id", lid)
            .eq("user_id", uid)
            .execute()
        )
        team = teams.data[0] if teams.data else None
        print(f"  member team: {'yes' if team else 'NO'} players={len(team['player_ids']) if team and team.get('player_ids') else 0}")
