-- Function to automatically set bot lineups when they receive weekly coins
CREATE OR REPLACE FUNCTION public.auto_set_bot_lineup(bot_id UUID, league_id UUID)
RETURNS void
LANGUAGE plpgsql
AS UTF8
DECLARE
    bot_record RECORD;
    team RECORD;
    current_week DATE;
    auto_lineup_players UUID[];
BEGIN
    -- Get bot information
    SELECT * INTO bot_record
    FROM public.bots b
    WHERE b.id = bot_id AND b.league_id = league_id;

    IF bot_record IS NULL THEN
        RAISE NOTICE 'Bot not found: %', bot_id;
        RETURN;
    END IF;

    -- Get current week (Tuesday of current week)
    current_week := CURRENT_DATE;
    WHILE EXTRACT(DOW FROM current_week) != 2 LOOP -- 2 = Tuesday
        current_week := current_week + INTERVAL '1 day';
    END LOOP;

    -- Get bot's team
    SELECT * INTO team
    FROM public.teams t
    WHERE t.bot_id = bot_id
      AND t.league_id = league_id;

    IF team.player_ids IS NOT NULL AND array_length(team.player_ids, 1) >= 5 THEN
        -- Bot chooses best players (highest accuracy)
        auto_lineup_players := ARRAY(
            SELECT cp.id
            FROM public.chess_players cp
            WHERE cp.id = ANY(team.player_ids)
            ORDER BY 
                CASE WHEN cp.accuracy IS NULL THEN 0 ELSE 1 END,
                cp.accuracy DESC NULLS LAST
            LIMIT 5
        );

        -- Delete any existing lineup for this bot/week
        DELETE FROM public.lineups l
        WHERE l.bot_id = bot_id 
          AND l.league_id = league_id 
          AND l.week_start_date = current_week;

        -- Insert the auto-created lineup for bot
        INSERT INTO public.lineups (bot_id, league_id, week_start_date, player_ids, total_points, created_at, updated_at)
        VALUES (bot_id, league_id, current_week, auto_lineup_players, 0, NOW(), NOW());

        RAISE NOTICE 'Auto-set lineup for bot %: % players selected for week %', 
            bot_record.name, array_length(auto_lineup_players, 1), current_week;
    ELSE
        RAISE NOTICE 'Bot % does not have enough players (need 5, has %)', 
            bot_record.name, COALESCE(array_length(team.player_ids, 1), 0);
    END IF;
END;
UTF8;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.auto_set_bot_lineup(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_set_bot_lineup(UUID, UUID) TO service_role;

-- Create a trigger function to automatically set bot lineup when coins are added
CREATE OR REPLACE FUNCTION public.trigger_auto_set_bot_lineup()
RETURNS TRIGGER
LANGUAGE plpgsql
AS UTF8
DECLARE
    bot_record RECORD;
BEGIN
    -- Check if this is a bot receiving weekly coins
    IF NEW.user_id IS NULL AND NEW.bot_id IS NOT NULL THEN
        -- Get bot information
        SELECT * INTO bot_record
        FROM public.bots b
        WHERE b.id = NEW.bot_id;

        IF bot_record IS NOT NULL THEN
            -- Auto-set the bot's lineup
            PERFORM public.auto_set_bot_lineup(NEW.bot_id, NEW.league_id);
        END IF;
    END IF;

    RETURN NEW;
END;
UTF8;

-- Create trigger on league_coin_balances table
DROP TRIGGER IF EXISTS auto_set_bot_lineup_trigger ON public.league_coin_balances;
CREATE TRIGGER auto_set_bot_lineup_trigger
    AFTER INSERT OR UPDATE ON public.league_coin_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_auto_set_bot_lineup();
