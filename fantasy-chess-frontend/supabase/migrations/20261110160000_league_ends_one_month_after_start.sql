-- Leagues last exactly one calendar month. 2026-10-01 ends 2026-11-01.
-- Sandbox backtest leagues keep their own dates.

UPDATE public.leagues
SET
    end_date = (start_date + INTERVAL '1 month')::date,
    updated_at = NOW()
WHERE join_code IS DISTINCT FROM 'SANDBOX'
  AND start_date IS NOT NULL
  AND end_date IS DISTINCT FROM (start_date + INTERVAL '1 month')::date;
