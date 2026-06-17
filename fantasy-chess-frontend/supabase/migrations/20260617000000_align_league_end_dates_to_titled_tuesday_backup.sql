-- Align active and upcoming league end dates with the final weekly scoring flow.
-- The season still uses the month after the start month as its window, but the
-- stored end date is the Wednesday after the last Titled Tuesday in that window
-- so Tuesday scoring/emails and the Wednesday backup can both run while active.

WITH recalculated_dates AS (
  SELECT
    id,
    (
      (
        DATE_TRUNC('month', start_date + INTERVAL '1 month')
        + INTERVAL '1 month - 1 day'
      )::DATE
      - (((EXTRACT(DOW FROM (
        DATE_TRUNC('month', start_date + INTERVAL '1 month')
        + INTERVAL '1 month - 1 day'
      )::DATE)::INT - 2 + 7) % 7))::INT
      + 1
    )::DATE AS aligned_end_date
  FROM public.leagues
  WHERE join_code IS DISTINCT FROM 'SANDBOX'
    AND COALESCE(payout_processed, false) = false
    AND end_date >= CURRENT_DATE
)
UPDATE public.leagues AS leagues
SET
  end_date = recalculated_dates.aligned_end_date,
  updated_at = NOW()
FROM recalculated_dates
WHERE leagues.id = recalculated_dates.id
  AND leagues.end_date IS DISTINCT FROM recalculated_dates.aligned_end_date;
