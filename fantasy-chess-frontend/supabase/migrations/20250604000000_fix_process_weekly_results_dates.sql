-- Fix process_weekly_results: match games (Tuesday, YYYY.MM.DD) to lineups (Monday, YYYY-MM-DD).
-- week_date parameter = Titled Tuesday (calendar date of the tournament).

DROP FUNCTION IF EXISTS public.process_weekly_results(DATE);

CREATE OR REPLACE FUNCTION public.process_weekly_results(week_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    league_record RECORD;
    member_id UUID;
    lineup_record RECORD;
    team RECORD;
    bot_record RECORD;
    auto_lineup_players UUID[];
    player_ids UUID[];
    calculated_points NUMERIC(10, 2);
    game_date_dotted TEXT;
    lineup_week_start DATE;
BEGIN
    IF week_date IS NULL THEN
        RAISE EXCEPTION 'week_date (Titled Tuesday) is required';
    END IF;

    game_date_dotted := to_char(week_date, 'YYYY.MM.DD');
    lineup_week_start := week_date - INTERVAL '1 day';

    RAISE NOTICE 'Processing TT % (games.date=%), lineups.week_start_date=%',
        week_date, game_date_dotted, lineup_week_start;

    FOR league_record IN
        SELECT * FROM public.leagues
        WHERE start_date <= week_date
          AND end_date >= week_date
    LOOP
        FOREACH member_id IN ARRAY league_record.member_ids
        LOOP
            SELECT * INTO lineup_record
            FROM public.lineups
            WHERE user_id = member_id
              AND league_id = league_record.id
              AND week_start_date = lineup_week_start;

            IF lineup_record IS NULL THEN
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

                    INSERT INTO public.lineups (
                        user_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at
                    )
                    VALUES (member_id, league_record.id, lineup_week_start, auto_lineup_players, 0, NOW(), NOW());

                    SELECT * INTO lineup_record
                    FROM public.lineups
                    WHERE user_id = member_id
                      AND league_id = league_record.id
                      AND week_start_date = lineup_week_start;
                END IF;
            END IF;

            IF lineup_record IS NOT NULL THEN
                player_ids := lineup_record.player_ids;

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
                                WHEN lower(g.white) = lower(pn.name) THEN g.white_points
                                WHEN lower(g.black) = lower(pn.name) THEN g.black_points
                                ELSE 0
                            END
                        ), 0) AS player_total_points
                    FROM player_names_cte pn
                    LEFT JOIN public.games g ON (
                        g.date = game_date_dotted
                        AND (lower(g.white) = lower(pn.name) OR lower(g.black) = lower(pn.name))
                    )
                )
                SELECT SUM(player_total_points) INTO calculated_points
                FROM player_points;

                UPDATE public.lineups
                SET total_points = calculated_points,
                    updated_at = NOW()
                WHERE id = lineup_record.id;
            END IF;
        END LOOP;

        SELECT * INTO bot_record
        FROM public.bots
        WHERE league_id = league_record.id;

        IF bot_record IS NOT NULL THEN
            SELECT * INTO lineup_record
            FROM public.lineups
            WHERE bot_id = bot_record.id
              AND league_id = league_record.id
              AND week_start_date = lineup_week_start;

            IF lineup_record IS NULL THEN
                SELECT * INTO team
                FROM public.teams
                WHERE bot_id = bot_record.id
                  AND league_id = league_record.id;

                IF team.player_ids IS NOT NULL AND array_length(team.player_ids, 1) >= 5 THEN
                    auto_lineup_players := ARRAY(
                        SELECT cp.id
                        FROM public.chess_players cp
                        WHERE cp.id = ANY(team.player_ids)
                        ORDER BY
                            CASE WHEN cp.accuracy IS NULL THEN 0 ELSE 1 END,
                            cp.accuracy DESC NULLS LAST
                        LIMIT 5
                    );

                    INSERT INTO public.lineups (
                        bot_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at
                    )
                    VALUES (bot_record.id, league_record.id, lineup_week_start, auto_lineup_players, 0, NOW(), NOW());

                    SELECT * INTO lineup_record
                    FROM public.lineups
                    WHERE bot_id = bot_record.id
                      AND league_id = league_record.id
                      AND week_start_date = lineup_week_start;
                END IF;
            END IF;

            IF lineup_record IS NOT NULL THEN
                player_ids := lineup_record.player_ids;

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
                                WHEN lower(g.white) = lower(pn.name) THEN g.white_points
                                WHEN lower(g.black) = lower(pn.name) THEN g.black_points
                                ELSE 0
                            END
                        ), 0) AS player_total_points
                    FROM player_names_cte pn
                    LEFT JOIN public.games g ON (
                        g.date = game_date_dotted
                        AND (lower(g.white) = lower(pn.name) OR lower(g.black) = lower(pn.name))
                    )
                )
                SELECT SUM(player_total_points) INTO calculated_points
                FROM player_points;

                UPDATE public.lineups
                SET total_points = calculated_points,
                    updated_at = NOW()
                WHERE id = lineup_record.id;
            END IF;
        END IF;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_weekly_results(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_weekly_results(DATE) TO service_role;
