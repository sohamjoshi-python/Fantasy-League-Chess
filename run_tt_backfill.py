"""Backfill Titled Tuesday imports from first Tuesday after 2026-05-18 through latest completed week."""
from datetime import date, timedelta

from titled_tuesday import convert

boundary = date(2026, 5, 18)
d = boundary + timedelta(days=1)
while d.weekday() != 1:
    d += timedelta(days=1)

today = date.today()
last_tt = today
while last_tt.weekday() != 1:
    last_tt -= timedelta(days=1)

dates = []
current = d
while current <= last_tt:
    dates.append(current)
    current += timedelta(days=7)

print(f"Importing {len(dates)} Titled Tuesdays: {[x.isoformat() for x in dates]}")

for tt_date in dates:
    print(f"\n{'=' * 80}\nRunning Titled Tuesday for {tt_date.isoformat()}\n{'=' * 80}\n", flush=True)
    try:
        result = convert(tt_date)
        if result is None:
            print(f"WARNING: convert returned None for {tt_date.isoformat()}", flush=True)
        else:
            print(f"SUCCESS: {tt_date.isoformat()}", flush=True)
    except Exception as e:
        print(f"FAILED for {tt_date.isoformat()}: {e}", flush=True)

print("\nAll done.", flush=True)
