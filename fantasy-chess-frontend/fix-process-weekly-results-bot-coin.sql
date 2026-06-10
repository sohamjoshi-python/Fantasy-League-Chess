-- =============================================================================
-- HOTFIX: paste entire file into Supabase Dashboard → SQL Editor → Run
-- Fixes lineup scoring silently failing when any active league has a bot.
-- =============================================================================

-- (Same as supabase/migrations/20260605120000_fix_process_weekly_results_bot_coin_conflict.sql)

CREATE UNIQUE INDEX IF NOT EXISTS league_coin_balances_bot_league_uidx
    ON public.league_coin_balances (bot_id, league_id)
    WHERE bot_id IS NOT NULL;

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
    bot_purchase_record RECORD;
    auto_lineup_players UUID[];
    player_ids UUID[];
    calculated_points NUMERIC(10, 2);
    game_date_dotted TEXT;
    lineup_week_start DATE;
    bot_balance INTEGER;
    updated_bot_balance INTEGER;
    has_balance_after BOOLEAN;
    team_found BOOLEAN;
    lineup_found BOOLEAN;
    purchase_found BOOLEAN;
BEGIN
    IF week_date IS NULL THEN
        RAISE EXCEPTION 'week_date (Titled Tuesday) is required';
    END IF;

    game_date_dotted := to_char(week_date, 'YYYY.MM.DD');
    lineup_week_start := week_date - INTERVAL '1 day';

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'coin_transactions'
          AND column_name = 'balance_after'
    ) INTO has_balance_after;

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
            lineup_found := FOUND;

            IF NOT lineup_found THEN
                SELECT * INTO team
                FROM public.teams
                WHERE user_id = member_id
                  AND league_id = league_record.id;

                IF team.player_ids IS NOT NULL AND array_length(team.player_ids, 1) >= 1 THEN
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
                    lineup_found := TRUE;
                END IF;
            END IF;

            IF lineup_found THEN
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

        FOR bot_record IN
            SELECT * FROM public.bots WHERE league_id = league_record.id
        LOOP
            SELECT * INTO team
            FROM public.teams
            WHERE bot_id = bot_record.id
              AND league_id = league_record.id;
            team_found := FOUND;

            IF NOT team_found THEN
                INSERT INTO public.teams (bot_id, league_id, player_ids, created_at)
                VALUES (bot_record.id, league_record.id, ARRAY[]::UUID[], NOW())
                RETURNING * INTO team;
            END IF;

            SELECT * INTO lineup_record
            FROM public.lineups
            WHERE bot_id = bot_record.id
              AND league_id = league_record.id
              AND week_start_date = lineup_week_start;
            lineup_found := FOUND;

            IF team.player_ids IS NOT NULL AND array_length(team.player_ids, 1) >= 1 THEN
                auto_lineup_players := ARRAY(
                    SELECT cp.id
                    FROM public.chess_players cp
                    WHERE cp.id = ANY(team.player_ids)
                    ORDER BY cp.elo DESC NULLS LAST, cp.name
                    LIMIT 5
                );

                IF NOT lineup_found THEN
                    INSERT INTO public.lineups (
                        bot_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at
                    )
                    VALUES (bot_record.id, league_record.id, lineup_week_start, auto_lineup_players, 0, NOW(), NOW())
                    RETURNING * INTO lineup_record;
                    lineup_found := TRUE;
                ELSE
                    UPDATE public.lineups
                    SET player_ids = auto_lineup_players,
                        updated_at = NOW()
                    WHERE id = lineup_record.id
                    RETURNING * INTO lineup_record;
                END IF;
            END IF;

            IF lineup_found THEN
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

            IF EXISTS (
                SELECT 1
                FROM public.coin_transactions ct
                WHERE ct.bot_id = bot_record.id
                  AND ct.league_id = league_record.id
                  AND ct.transaction_type = 'player_purchase'
                  AND ct.description LIKE ('Weekly bot purchase after TT ' || week_date::TEXT || ':%')
            ) THEN
                CONTINUE;
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM public.league_coin_balances
                WHERE bot_id = bot_record.id
                  AND league_id = league_record.id
            ) THEN
                INSERT INTO public.league_coin_balances (bot_id, league_id, coin_balance, created_at, updated_at)
                VALUES (bot_record.id, league_record.id, 50, NOW(), NOW());
            END IF;

            SELECT coin_balance INTO bot_balance
            FROM public.league_coin_balances
            WHERE bot_id = bot_record.id
              AND league_id = league_record.id;

            IF COALESCE(bot_balance, 0) <= 0 THEN
                CONTINUE;
            END IF;

            WITH available_players AS (
                SELECT
                    cp.id,
                    cp.name,
                    cp.elo,
                    CASE
                        WHEN cp.elo >= 3200 THEN 50
                        WHEN cp.elo >= 3100 THEN 40
                        WHEN cp.elo >= 3000 THEN 30
                        WHEN cp.elo >= 2900 THEN 20
                        WHEN cp.elo >= 2700 THEN 15
                        WHEN cp.elo >= 2400 THEN 10
                        ELSE 5
                    END AS price
                FROM public.chess_players cp
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM public.teams t
                    WHERE t.league_id = league_record.id
                      AND cp.id = ANY(COALESCE(t.player_ids, ARRAY[]::UUID[]))
                )
            )
            SELECT * INTO bot_purchase_record
            FROM available_players
            WHERE price <= bot_balance
            ORDER BY elo DESC NULLS LAST, name
            LIMIT 1;
            purchase_found := FOUND;

            IF NOT purchase_found THEN
                CONTINUE;
            END IF;

            UPDATE public.teams
            SET player_ids = COALESCE(player_ids, ARRAY[]::UUID[]) || bot_purchase_record.id
            WHERE id = team.id;

            UPDATE public.league_coin_balances
            SET coin_balance = coin_balance - bot_purchase_record.price,
                updated_at = NOW()
            WHERE bot_id = bot_record.id
              AND league_id = league_record.id
            RETURNING coin_balance INTO updated_bot_balance;

            IF has_balance_after THEN
                EXECUTE
                    'INSERT INTO public.coin_transactions
                        (bot_id, league_id, transaction_type, amount, balance_after, description, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())'
                USING
                    bot_record.id,
                    league_record.id,
                    'player_purchase',
                    -bot_purchase_record.price,
                    updated_bot_balance,
                    'Weekly bot purchase after TT ' || week_date::TEXT || ': ' || bot_purchase_record.name;
            ELSE
                INSERT INTO public.coin_transactions (
                    bot_id, league_id, transaction_type, amount, description, created_at
                )
                VALUES (
                    bot_record.id,
                    league_record.id,
                    'player_purchase',
                    -bot_purchase_record.price,
                    'Weekly bot purchase after TT ' || week_date::TEXT || ': ' || bot_purchase_record.name,
                    NOW()
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_weekly_results(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_weekly_results(DATE) TO service_role;

-- Score Dev League12c: lineups on Monday 2026-06-01, games on 2026.06.02
UPDATE public.leagues
SET start_date = '2026-06-01'
WHERE id = '505336f9-e474-4874-b897-81c66f747e9c'
  AND start_date > '2026-06-02';

SELECT public.process_weekly_results('2026-06-02'::date);

SELECT week_start_date, total_points, user_id, bot_id
FROM public.lineups
WHERE league_id = '505336f9-e474-4874-b897-81c66f747e9c'
ORDER BY week_start_date;
