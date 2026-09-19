-- Make the 7-day start-date trigger compare calendar dates only,
-- so valid future dates are not rejected by timestamp/timezone casts.

CREATE OR REPLACE FUNCTION public.enforce_league_min_start_lead_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    min_start date;
    start_day date;
BEGIN
    min_start := (NOW() AT TIME ZONE 'America/Los_Angeles')::date + 7;
    start_day := NEW.start_date::date;

    IF start_day IS NULL OR start_day < min_start THEN
        RAISE EXCEPTION 'League start date must be at least 7 days from today (%).', min_start
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_league_min_start_lead_time ON public.leagues;
CREATE TRIGGER trg_enforce_league_min_start_lead_time
    BEFORE INSERT ON public.leagues
    FOR EACH ROW
    EXECUTE PROCEDURE public.enforce_league_min_start_lead_time();
