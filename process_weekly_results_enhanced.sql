CREATE OR REPLACE FUNCTION public.process_weekly_results_enhanced(week_date date)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    league_record RECORD;
    member RECORD;
    lineup_record RECORD;
    team RECORD;
    auto_lineup_players UUID[];
    player_ids UUID[];
    player_names TEXT[];
    calculated_points DECIMAL(10,2);
    formatted_date TEXT;
BEGIN
    -- Format the date with dots instead of hyphens to match the games table format
    formatted_date := to_char(week_date, 'YYYY.MM.DD');
    
    -- Debug: Show the formatted date
    RAISE NOTICE 'Processing week date: %, formatted as: %', week_date, formatted_date;

    -- Loop through all active leagues
    FOR league_record IN 
        SELECT * FROM public.leagues 
        WHERE start_date <= week_date AND end_date >= week_date
    LOOP
        -- Loop through all league members
        FOR member IN 
            SELECT * FROM public.league_members WHERE league_id = league_record.id
        LOOP
            -- Get user's lineup for the week
            SELECT * INTO lineup_record 
            FROM public.lineups 
            WHERE user_id = member.user_id 
              AND league_id = league_record.id 
              AND week_start_date = week_date;

            -- If no lineup exists, create one automatically with lowest accuracy players
            IF lineup_record IS NULL THEN
                -- Get user's team
                SELECT * INTO team
                FROM public.teams
                WHERE user_id = member.user_id
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
                    VALUES (member.user_id, league_record.id, week_date, auto_lineup_players, 0, NOW(), NOW());

                    -- Fetch the newly created lineup
                    SELECT * INTO lineup_record 
                    FROM public.lineups 
                    WHERE user_id = member.user_id 
                      AND league_id = league_record.id 
                      AND week_start_date = week_date;
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
                RAISE NOTICE 'Processing lineup for user %: player_ids %, player_names %', member.user_id, player_ids, player_names;

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
                    member.user_id, week_date, formatted_date, calculated_points;

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