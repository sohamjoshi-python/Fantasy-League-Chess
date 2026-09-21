# Fantasy League Chess

A fantasy sports app for chess. Join a league, draft titled players, set weekly lineups, and score points from Chess.com Titled Tuesday results.

## What’s in this repo

| Path | What it is |
|------|------------|
| `fantasy-chess-frontend/` | Vite + React + TypeScript app (Vercel) |
| `fantasy-chess-frontend/supabase/migrations/` | Live Postgres schema history |
| `fantasy-chess-frontend/supabase/functions/` | Deployed Edge Functions |
| `titled_tuesday.py`, `update_elo.py` | Weekly ingest / ELO refresh |
| `.github/workflows/` | Cron jobs for scoring, emails, marketplace |

Schema changes belong in `fantasy-chess-frontend/supabase/migrations/`. Do not add one-off SQL files at the repo root.

## Quick start

```bash
cd fantasy-chess-frontend
cp .env.example .env
npm install
npm run dev
```

Fill `.env` with your Supabase **project URL** and **publishable key** only. Put the **secret key**, **Resend API key**, and **Vercel tokens** in GitHub Actions / Supabase / Vercel secrets — never in git.

## Secrets

This project uses Supabase's API keys (`sb_publishable_...` / `sb_secret_...`). The
legacy anon and service_role JWTs are still accepted as a fallback so nothing
breaks mid-migration; remove them once the legacy keys are disabled in the
dashboard.

Keep these out of the repo:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — local `.env` (the publishable key is public-ish, still do not commit real project files)
- `SB_SECRET_KEY` — GitHub Actions + Edge Functions only
- `RESEND_API_KEY` — Supabase Edge Function secrets
- Vercel tokens — Vercel dashboard / CI secrets

Copy `.env.example` files; gitignores block `.env`, `.env.*`, `*.pem`, and `*.key`.

## License

[MIT](LICENSE)
