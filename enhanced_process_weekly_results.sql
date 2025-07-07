-- Enhanced process_weekly_results function with automatic lineup creation
CREATE OR REPLACE FUNCTION public.process_weekly_results_enhanced(week_date DATE)
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
    user_record RECORD;
    lineup_record RECORD;
    game_record RECORD;
    player_record RECORD;
    total_points DECIMAL(5,2);
    player_points DECIMAL(5,2);
    auto_lineup_players UUID[];
    player_with_accuracy RECORD;
BEGIN
    -- Loop through all active leagues
    FOR league_record IN 
        SELECT * FROM public.leagues 
        WHERE start_date <= week_date AND end_date >= week_date
    LOOP
        -- Loop through all users in the league
        FOR user_record IN 
            SELECT unnest(member_ids) as user_id
        LOOP
            -- Get user's lineup for the week
            SELECT * INTO lineup_record 
            FROM public.lineups 
            WHERE user_id = user_record.user_id 
              AND league_id = league_record.id 
              AND week_start_date = week_date;
            
            -- If no lineup exists, create one automatically with lowest accuracy players
            IF lineup_record IS NULL THEN
                -- Get user's team players sorted by accuracy (lowest first, nulls last)
                auto_lineup_players := ARRAY[]::UUID[];
                
                FOR player_with_accuracy IN 
                    SELECT cp.id, cp.name, cp.accuracy
                    FROM public.teams t
                    JOIN public.chess_players cp ON cp.id = ANY(t.player_ids)
                    WHERE t.user_id = user_record.user_id 
                      AND t.league_id = league_record.id
                    ORDER BY 
                        CASE WHEN cp.accuracy IS NULL THEN 1 ELSE 0 END,
                        cp.accuracy ASC NULLS LAST
                    LIMIT 5
                LOOP
                    auto_lineup_players := array_append(auto_lineup_players, player_with_accuracy.id);
                END LOOP;
                
                -- Only create lineup if we have at least 5 players
                IF array_length(auto_lineup_players, 1) >= 5 THEN
                    INSERT INTO public.lineups (
                        user_id, 
                        league_id, 
                        week_start_date, 
                        player_ids, 
                        total_points
                    ) VALUES (
                        user_record.user_id,
                        league_record.id,
                        week_date,
                        auto_lineup_players,
                        0
                    );
                    
                    -- Get the newly created lineup
                    SELECT * INTO lineup_record 
                    FROM public.lineups 
                    WHERE user_id = user_record.user_id 
                      AND league_id = league_record.id 
                      AND week_start_date = week_date;
                    
                    RAISE NOTICE 'Created automatic lineup for user % with players: %', 
                        user_record.user_id, auto_lineup_players;
                ELSE
                    RAISE NOTICE 'User % has fewer than 5 players, skipping automatic lineup creation', 
                        user_record.user_id;
                    CONTINUE;
                END IF;
            END IF;
            
            -- Now process the lineup (either existing or newly created)
            IF lineup_record IS NOT NULL THEN
                total_points := 0;
                
                -- Get the drafted players for this user
                SELECT * INTO player_record 
                FROM public.teams 
                WHERE user_id = user_record.user_id 
                  AND league_id = league_record.id;
                
                IF player_record IS NOT NULL THEN
                    -- For each player in the lineup, sum their pre-calculated points from games table
                    FOR game_record IN 
                        SELECT g.*, cp.name as player_name
                        FROM public.games g
                        JOIN public.chess_players cp ON g.white = cp.name OR g.black = cp.name
                        WHERE g.date = week_date::text
                          AND cp.id = ANY(lineup_record.player_ids)
                    LOOP
                        -- Determine if the player is white or black and get their points
                        IF game_record.white = game_record.player_name THEN
                            player_points := game_record.white_points;
                        ELSE
                            player_points := game_record.black_points;
                        END IF;
                        
                        total_points := total_points + player_points;
                    END LOOP;
                END IF;
                
                -- Update lineup with calculated points
                UPDATE public.lineups 
                SET total_points = total_points,
                    updated_at = NOW()
                WHERE id = lineup_record.id;
                
                RAISE NOTICE 'Processed lineup for user %: % points', user_record.user_id, total_points;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql; 