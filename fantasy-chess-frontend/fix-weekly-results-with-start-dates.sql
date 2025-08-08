-- Fix process_weekly_results function to properly use league start dates
DROP FUNCTION IF EXISTS public.process_weekly_results(DATE);

CREATE OR REPLACE FUNCTION public.process_weekly_results(week_date date)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    league_record RECORD;
    member_id UUID;
    lineup_record RECORD;
    team RECORD;
    auto_lineup_players UUID[];
    player_ids UUID[];
    player_names TEXT[];
    calculated_points INTEGER;
    formatted_date TEXT;
    league_week_date DATE;
BEGIN
    -- Loop through all active leagues
    FOR league_record IN 
        SELECT * FROM public.leagues 
        WHERE start_date IS NOT NULL
    LOOP
        -- Calculate the week date for this specific league based on its start date
        -- Find the Tuesday of the week that contains the league's start date
        league_week_date := league_record.start_date;
        
        -- Adjust to the Tuesday of that week
        WHILE EXTRACT(DOW FROM league_week_date) != 2 LOOP -- 2 = Tuesday
            league_week_date := league_week_date + INTERVAL '1 day';
        END LOOP;
        
        -- Format the date for game matching
        formatted_date := to_char(league_week_date, 'YYYY-MM-DD');
        RAISE NOTICE 'Processing league % (start_date: %) for week date: %, formatted as: %', 
            league_record.name, league_record.start_date, league_week_date, formatted_date;

        -- Loop through all league members (using member_ids array)
        FOREACH member_id IN ARRAY league_record.member_ids
        LOOP
            -- Get user's lineup for the week
            SELECT * INTO lineup_record 
            FROM public.lineups 
            WHERE user_id = member_id 
              AND league_id = league_record.id 
              AND week_start_date = league_week_date;

            -- If no lineup exists, create one automatically with lowest accuracy players
            IF lineup_record IS NULL THEN
                -- Get user's team
                SELECT * INTO team
                FROM public.teams
                WHERE user_id = member_id
                  AND league_id = league_record.id;

                IF team.player_ids IS NOT NULL AND array_length(team.player_ids, 1) >= 5 THEN
                    auto_lineup_players := ARRAY(
                        SELECT cp.id
                        FROM public.chess_players cp
                        WHERE cp.id = ANY(team.player_ids)
                        ORDER BY 
                            CASE WHEN cp.accuracy IS NULL THEN 1 ELSE 0 END,
                            cp.accuracy ASC NULLS LAST
                        LIMIT 5
                    );

                    -- Insert the auto-created lineup
                    INSERT INTO public.lineups (user_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
                    VALUES (member_id, league_record.id, league_week_date, auto_lineup_players, 0, NOW(), NOW());

                    -- Fetch the newly created lineup
                    SELECT * INTO lineup_record 
                    FROM public.lineups 
                    WHERE user_id = member_id 
                      AND league_id = league_record.id 
                      AND week_start_date = league_week_date;
                END IF;
            END IF;

            -- If lineup exists (either user-set or auto-created), sum points from games
            IF lineup_record IS NOT NULL THEN
                player_ids := lineup_record.player_ids;

                -- Get the names of the players in the lineup
                SELECT array_agg(name) INTO player_names
                FROM public.chess_players
                WHERE id = ANY(player_ids);

                -- Debug: Show which players are being processed
                RAISE NOTICE 'Processing lineup for user %: player_ids %, player_names %', member_id, player_ids, player_names;

                -- Calculate points using the corrected approach that matches the test query
                WITH lineup_players AS (
                    SELECT unnest(player_ids) AS player_id
                ),
                player_names_cte AS (
                    SELECT lp.player_id, cp.name
                    FROM lineup_players lp
                    JOIN public.chess_players cp ON cp.id = lp.player_id
                ),
                player_points AS (
                    SELECT
                        COALESCE(SUM(
                            CASE
                                WHEN g.white = pn.name THEN g.white_points
                                WHEN g.black = pn.name THEN g.black_points
                                ELSE 0
                            END
                        ), 0) AS player_total_points
                    FROM player_names_cte pn
                    LEFT JOIN public.games g ON g.date = formatted_date AND (g.white = pn.name OR g.black = pn.name)
                )
                SELECT SUM(player_total_points) INTO calculated_points
                FROM player_points;

                -- Debug: Show the total points calculated
                RAISE NOTICE 'Total points for user % on % (formatted as %): %', 
                    member_id, league_week_date, formatted_date, calculated_points;

                -- Update lineup with calculated points
                UPDATE public.lineups 
                SET total_points = calculated_points,
                    updated_at = NOW()
                WHERE id = lineup_record.id;
            END IF;
        END LOOP;
    END LOOP;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_weekly_results(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_weekly_results(DATE) TO service_role;

-- Verify the function exists and show league start dates
SELECT 
    proname as function_name,
    'Function updated successfully' as status
FROM pg_proc 
WHERE proname = 'process_weekly_results';

-- Show league start dates for verification
SELECT 
    id,
    name,
    start_date,
    CASE 
        WHEN start_date IS NOT NULL THEN 
            start_date + (2 - EXTRACT(DOW FROM start_date)::int) * INTERVAL '1 day'
        ELSE NULL 
    END as calculated_tuesday
FROM leagues 
WHERE start_date IS NOT NULL
ORDER BY start_date; 