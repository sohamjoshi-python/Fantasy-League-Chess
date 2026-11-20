-- The old check only allowed seven early notification types, so draft-turn, trade, and general
-- inbox notifications were rejected. Approved by the owner: swap it for a non-empty check.
-- No rows are touched.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (length(btrim(type)) > 0);
