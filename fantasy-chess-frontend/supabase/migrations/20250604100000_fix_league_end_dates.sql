-- Fix leagues whose end_date was computed incorrectly (last day of start month
-- instead of last day of the following month). Skips sandbox backtest leagues.

UPDATE public.leagues
SET
    end_date = (
        DATE_TRUNC('month', start_date + INTERVAL '1 month')
        + INTERVAL '1 month - 1 day'
    )::DATE,
    updated_at = NOW()
WHERE join_code IS DISTINCT FROM 'SANDBOX'
  AND (
    end_date < start_date
    OR end_date < (
        DATE_TRUNC('month', start_date + INTERVAL '1 month')
        + INTERVAL '1 month - 1 day'
    )::DATE
  );
