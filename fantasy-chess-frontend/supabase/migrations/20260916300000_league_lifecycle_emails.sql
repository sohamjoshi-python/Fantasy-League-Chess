-- Track marketplace-start and league-start emails so members are notified once.

ALTER TABLE public.leagues
    ADD COLUMN IF NOT EXISTS marketplace_started_email_sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS league_started_email_sent_at timestamptz;

-- Do not email historical events that already happened.
UPDATE public.leagues
SET marketplace_started_email_sent_at = COALESCE(marketplace_start_time, NOW())
WHERE COALESCE(marketplace_started, false) = true
  AND marketplace_started_email_sent_at IS NULL;

UPDATE public.leagues
SET league_started_email_sent_at = NOW()
WHERE start_date IS NOT NULL
  AND start_date <= (NOW() AT TIME ZONE 'America/Los_Angeles')::date
  AND league_started_email_sent_at IS NULL;
