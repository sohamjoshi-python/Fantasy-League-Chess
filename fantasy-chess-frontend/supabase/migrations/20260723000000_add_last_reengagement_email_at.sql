-- Track when we last sent a re-engagement ("no active leagues") nudge email to a user.
-- The weekly results job uses this to throttle nudges so inactive users are not spammed.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_reengagement_email_at timestamptz;
