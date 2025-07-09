-- Migration to merge player_accuracy and chess_players tables
-- Run this in your Supabase SQL editor

-- Step 1: Create a new comprehensive chess_players table
CREATE TABLE IF NOT EXISTS public.chess_players_new (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    elo INTEGER,
    fide_id TEXT,
    country TEXT,
    accuracy DECIMAL(10,2),
    games INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Migrate data from existing tables
-- First, insert all players from chess_players table
INSERT INTO public.chess_players_new (id, name, elo, fide_id, country, created_at)
SELECT 
    CASE 
        WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::UUID
        ELSE extensions.uuid_generate_v4()
    END as id,
    name,
    elo,
    fide_id,
    country,
    created_at
FROM public.chess_players
ON CONFLICT (name) DO NOTHING;

-- Step 3: Update with accuracy data from player_accuracy table
UPDATE public.chess_players_new 
SET 
    accuracy = pa.accuracy,
    games = pa.games,
    updated_at = pa.updated_at
FROM public.player_accuracy pa
WHERE chess_players_new.name = pa.player;

-- Step 4: Insert any players from player_accuracy that aren't in chess_players
INSERT INTO public.chess_players_new (id, name, accuracy, games, created_at, updated_at)
SELECT 
    extensions.uuid_generate_v4() as id,
    pa.player as name,
    pa.accuracy,
    pa.games,
    pa.created_at,
    pa.updated_at
FROM public.player_accuracy pa
WHERE NOT EXISTS (
    SELECT 1 FROM public.chess_players_new cpn WHERE cpn.name = pa.player
);

-- Step 5: Drop the old tables
DROP TABLE IF EXISTS public.chess_players;
DROP TABLE IF EXISTS public.player_accuracy;

-- Step 6: Rename the new table to the original name
ALTER TABLE public.chess_players_new RENAME TO chess_players;

-- Step 7: Recreate indexes and constraints
CREATE INDEX IF NOT EXISTS idx_chess_players_name ON public.chess_players (name);
CREATE INDEX IF NOT EXISTS idx_chess_players_elo ON public.chess_players (elo);
CREATE INDEX IF NOT EXISTS idx_chess_players_accuracy ON public.chess_players (accuracy);

-- Step 8: Update RLS policies for the merged table
ALTER TABLE public.chess_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view chess players" ON public.chess_players;
CREATE POLICY "Anyone can view chess players" ON public.chess_players
    FOR SELECT USING (true);

-- Step 9: Insert some sample players if the table is empty
INSERT INTO public.chess_players (id, name, elo, country) VALUES
(extensions.uuid_generate_v4(), 'Magnus Carlsen', 2830, 'Norway'),
(extensions.uuid_generate_v4(), 'Hikaru Nakamura', 2780, 'United States'),
(extensions.uuid_generate_v4(), 'Fabiano Caruana', 2804, 'United States'),
(extensions.uuid_generate_v4(), 'Ding Liren', 2780, 'China'),
(extensions.uuid_generate_v4(), 'Alireza Firouzja', 2759, 'France'),
(extensions.uuid_generate_v4(), 'Wesley So', 2757, 'United States'),
(extensions.uuid_generate_v4(), 'Levon Aronian', 2755, 'United States'),
(extensions.uuid_generate_v4(), 'Shakhriyar Mamedyarov', 2750, 'Azerbaijan'),
(extensions.uuid_generate_v4(), 'Maxime Vachier-Lagrave', 2749, 'France'),
(extensions.uuid_generate_v4(), 'Ian Nepomniachtchi', 2749, 'Russia'),
(extensions.uuid_generate_v4(), 'Anish Giri', 2747, 'Netherlands'),
(extensions.uuid_generate_v4(), 'Richard Rapport', 2740, 'Romania'),
(extensions.uuid_generate_v4(), 'Teimour Radjabov', 2736, 'Azerbaijan'),
(extensions.uuid_generate_v4(), 'Leinier Dominguez', 2734, 'United States'),
(extensions.uuid_generate_v4(), 'Sam Shankland', 2730, 'United States'),
(extensions.uuid_generate_v4(), 'Jeffery Xiong', 2725, 'United States'),
(extensions.uuid_generate_v4(), 'Ray Robson', 2720, 'United States'),
(extensions.uuid_generate_v4(), 'Daniel Naroditsky', 2715, 'United States'),
(extensions.uuid_generate_v4(), 'Andrew Tang', 2710, 'United States'),
(extensions.uuid_generate_v4(), 'Hans Niemann', 2705, 'United States')
ON CONFLICT (name) DO NOTHING;

-- Step 10: Update the process_weekly_results function to use the merged table
CREATE OR REPLACE FUNCTION public.process_weekly_results(week_date DATE)
RETURNS VOID AS $$
DECLARE
    league_record RECORD;
    user_record RECORD;
    lineup_record RECORD;
    game_record RECORD;
    player_record RECORD;
    total_points DECIMAL(5,2);
    player_points DECIMAL(5,2);
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
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql; 

-- Add payout_processed flag to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS payout_processed boolean NOT NULL DEFAULT false;

-- Add balance column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0;

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES leagues(id),
  user_id uuid REFERENCES users(id),
  amount numeric NOT NULL,
  processed_at timestamp NOT NULL DEFAULT now()
);

-- Function to process league payouts
CREATE OR REPLACE FUNCTION process_league_payouts()
RETURNS void AS $$
DECLARE
  league_row RECORD;
  winner_id uuid;
  prize numeric;
BEGIN
  FOR league_row IN
    SELECT * FROM leagues
    WHERE end_date < now() AND payout_processed = false
  LOOP
    -- Find winner (user with most total points)
    SELECT user_id
    INTO winner_id
    FROM lineups
    WHERE league_id = league_row.id
    GROUP BY user_id
    ORDER BY SUM(total_points) DESC
    LIMIT 1;

    -- Calculate prize
    prize := league_row.buy_in * COALESCE(array_length(league_row.member_ids, 1), 0);

    -- Award prize: record payout
    INSERT INTO payouts (league_id, user_id, amount)
    VALUES (league_row.id, winner_id, prize);

    -- Update user balance
    UPDATE users SET balance = balance + prize WHERE id = winner_id;

    -- Mark payout as processed
    UPDATE leagues SET payout_processed = true WHERE id = league_row.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- (Optional) You can schedule this function to run daily using GitHub Actions or another scheduler. 