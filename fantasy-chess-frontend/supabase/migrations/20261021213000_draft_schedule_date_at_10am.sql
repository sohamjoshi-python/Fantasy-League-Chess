-- A scheduled draft is a date, not a clock time. Snap it to 10:00 AM Pacific
-- and reject a date later than one week before the league start date.

CREATE OR REPLACE FUNCTION public.normalize_marketplace_schedule()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    pacific_day date;
BEGIN
    IF NEW.marketplace_scheduled_at IS NULL THEN
        RETURN NEW;
    END IF;

    pacific_day := (NEW.marketplace_scheduled_at AT TIME ZONE 'America/Los_Angeles')::date;
    NEW.marketplace_scheduled_at := (pacific_day + time '10:00') AT TIME ZONE 'America/Los_Angeles';

    IF NEW.start_date IS NOT NULL AND pacific_day > (NEW.start_date - 7) THEN
        RAISE EXCEPTION 'Draft date must be at least a week before the league start date';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_marketplace_schedule ON public.leagues;

CREATE TRIGGER trg_normalize_marketplace_schedule
    BEFORE INSERT OR UPDATE OF marketplace_scheduled_at, start_date
    ON public.leagues
    FOR EACH ROW
    EXECUTE PROCEDURE public.normalize_marketplace_schedule();
