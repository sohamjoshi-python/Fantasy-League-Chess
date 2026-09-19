-- End the requested league this week, after the Wednesday backup window.

UPDATE public.leagues
SET
  end_date = DATE '2026-06-17',
  updated_at = NOW()
WHERE join_code = '7O0VJ2';
