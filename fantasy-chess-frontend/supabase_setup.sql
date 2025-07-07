-- Fantasy Chess Database Setup
-- Run this script in your Supabase SQL editor

-- Enable necessary extensions in the extensions schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT UNIQUE,
    coins INTEGER DEFAULT 100 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chess_players table (for fantasy draft purposes)
CREATE TABLE IF NOT EXISTS public.chess_players (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    elo INTEGER NOT NULL,
    fide_id TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leagues table
CREATE TABLE IF NOT EXISTS public.leagues (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    buy_in INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    join_code TEXT UNIQUE NOT NULL,
    creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    member_ids UUID[] DEFAULT '{}',
    draft_order UUID[] DEFAULT '{}',
    current_draft_turn INTEGER DEFAULT 0,
    draft_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    player_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, league_id)
);

-- Create lineups table
CREATE TABLE IF NOT EXISTS public.lineups (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    player_ids UUID[] DEFAULT '{}',
    total_points DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, league_id, week_start_date)
);

-- Create games table (matches pgn_to_csv.py output)
CREATE TABLE IF NOT EXISTS public.games (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    early_late TEXT NOT NULL,
    date TEXT NOT NULL,
    white TEXT NOT NULL,
    black TEXT NOT NULL,
    result TEXT NOT NULL,
    white_accuracy DECIMAL(10,2),
    black_accuracy DECIMAL(10,2),
    round TEXT,
    white_points DECIMAL(5,2),
    black_points DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player_accuracy table (matches pgn_to_csv.py output)
CREATE TABLE IF NOT EXISTS public.player_accuracy (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    player TEXT NOT NULL UNIQUE,
    accuracy DECIMAL(10,2),
    games INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, username)
    VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to generate join codes
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_already BOOLEAN;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM public.leagues WHERE join_code = code) INTO exists_already;
        IF NOT exists_already THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate fantasy points (matches fantasy_chess_scoring.py)
CREATE OR REPLACE FUNCTION public.calculate_fantasy_points(
    player_elo INTEGER,
    opponent_elo INTEGER,
    result DECIMAL(1,1),
    player_acl DECIMAL(10,2),
    avg_acl DECIMAL(10,2)
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    expected_score DECIMAL(5,4);
    acl_delta DECIMAL(10,2);
    raw_points DECIMAL(5,2);
    base_coeff DECIMAL(3,1) := 2.0;
    surprise_coeff DECIMAL(3,1) := 5.0;
    accuracy_coeff DECIMAL(3,1) := 0.30;
    cap_low DECIMAL(4,1) := -6.0;
    cap_high DECIMAL(4,1) := 12.0;
BEGIN
    -- Calculate expected score
    expected_score := 1.0 / (1.0 + power(10, (opponent_elo - player_elo) / 400.0));
    
    -- Handle ACL calculation
    IF player_acl IS NULL OR avg_acl IS NULL OR (player_acl = 0 AND avg_acl = 0) THEN
        acl_delta := 0;
    ELSE
        acl_delta := avg_acl - player_acl;
    END IF;
    
    -- Calculate raw points
    raw_points := base_coeff * result + 
                  surprise_coeff * (result - expected_score) + 
                  accuracy_coeff * acl_delta;
    
    -- Apply caps and round
    RETURN ROUND(GREATEST(LEAST(raw_points, cap_high), cap_low), 2);
END;
$$ LANGUAGE plpgsql;

-- Create function to process weekly results from games table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leagues_member_ids ON public.leagues USING GIN (member_ids);
CREATE INDEX IF NOT EXISTS idx_leagues_start_date ON public.leagues (start_date);
CREATE INDEX IF NOT EXISTS idx_leagues_end_date ON public.leagues (end_date);
CREATE INDEX IF NOT EXISTS idx_leagues_join_code ON public.leagues (join_code);
CREATE INDEX IF NOT EXISTS idx_teams_user_league ON public.teams (user_id, league_id);
CREATE INDEX IF NOT EXISTS idx_lineups_user_league_week ON public.lineups (user_id, league_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_games_date ON public.games (date);
CREATE INDEX IF NOT EXISTS idx_games_white ON public.games (white);
CREATE INDEX IF NOT EXISTS idx_games_black ON public.games (black);
CREATE INDEX IF NOT EXISTS idx_player_accuracy_player ON public.player_accuracy (player);

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chess_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_accuracy ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Chess players policies (public read access)
DROP POLICY IF EXISTS "Anyone can view chess players" ON public.chess_players;
CREATE POLICY "Anyone can view chess players" ON public.chess_players
    FOR SELECT USING (true);

-- Leagues policies
DROP POLICY IF EXISTS "Anyone can view public leagues" ON public.leagues;
CREATE POLICY "Anyone can view public leagues" ON public.leagues
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Members can view their leagues" ON public.leagues;
CREATE POLICY "Members can view their leagues" ON public.leagues
    FOR SELECT USING (auth.uid() = ANY(member_ids));

DROP POLICY IF EXISTS "Users can create leagues" ON public.leagues;
CREATE POLICY "Users can create leagues" ON public.leagues
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their leagues" ON public.leagues;
CREATE POLICY "Creators can update their leagues" ON public.leagues
    FOR UPDATE USING (auth.uid() = creator_id);

-- Teams policies
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;
CREATE POLICY "Users can view their own teams" ON public.teams
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view teams in their leagues" ON public.teams;
CREATE POLICY "Users can view teams in their leagues" ON public.teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leagues 
            WHERE id = league_id AND auth.uid() = ANY(member_ids)
        )
    );

DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
CREATE POLICY "Users can create their own teams" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
CREATE POLICY "Users can update their own teams" ON public.teams
    FOR UPDATE USING (auth.uid() = user_id);

-- Lineups policies
DROP POLICY IF EXISTS "Users can view their own lineups" ON public.lineups;
CREATE POLICY "Users can view their own lineups" ON public.lineups
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view lineups in their leagues" ON public.lineups;
CREATE POLICY "Users can view lineups in their leagues" ON public.lineups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leagues 
            WHERE id = league_id AND auth.uid() = ANY(member_ids)
        )
    );

DROP POLICY IF EXISTS "Users can create their own lineups" ON public.lineups;
CREATE POLICY "Users can create their own lineups" ON public.lineups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lineups" ON public.lineups;
CREATE POLICY "Users can update their own lineups" ON public.lineups
    FOR UPDATE USING (auth.uid() = user_id);

-- Games and player_accuracy policies (read-only for users, insert/update for admin)
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
CREATE POLICY "Anyone can view games" ON public.games
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view player accuracy" ON public.player_accuracy;
CREATE POLICY "Anyone can view player accuracy" ON public.player_accuracy
    FOR SELECT USING (true);

-- Insert some sample chess players (matching the names from pgn_to_csv.py)
-- Explicitly providing UUID values to avoid null id issue
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
ON CONFLICT DO NOTHING;

-- Create a function to get league standings
CREATE OR REPLACE FUNCTION public.get_league_standings(league_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    total_points DECIMAL(5,2),
    rank INTEGER,
    team_size INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH user_points AS (
        SELECT 
            l.user_id,
            u.email as user_email,
            COALESCE(SUM(l.total_points), 0) as total_points,
            COUNT(t.player_ids) as team_size
        FROM public.lineups l
        JOIN public.users u ON l.user_id = u.id
        LEFT JOIN public.teams t ON l.user_id = t.user_id AND l.league_id = t.league_id
        WHERE l.league_id = league_uuid
        GROUP BY l.user_id, u.email
    )
    SELECT 
        up.user_id,
        up.user_email,
        up.total_points,
        ROW_NUMBER() OVER (ORDER BY up.total_points DESC) as rank,
        up.team_size
    FROM user_points up
    ORDER BY up.total_points DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;