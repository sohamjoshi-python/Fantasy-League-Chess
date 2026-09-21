# Fantasy League Chess — frontend

Vite + React + TypeScript app. Schema lives in `supabase/migrations/`. Edge Functions live in `supabase/functions/`.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

`.env` needs only:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
```

Both come from Supabase → Settings → API Keys.

Never put a secret key, Resend key, or Vercel token in a `VITE_` variable. Vite inlines those into the browser bundle.

## Database

Apply schema with the Supabase CLI from this directory:

```bash
npx supabase db push
```

Do not paste one-off SQL files into the dashboard as a substitute for migrations.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run distribute-coins
npm run bot-ai
npm run populate-marketplace
```
