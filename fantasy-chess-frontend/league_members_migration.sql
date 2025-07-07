-- League Members Table Migration
-- This table stores display names for league members to avoid Auth API limitations

-- Create league_members table
CREATE TABLE IF NOT EXISTS public.league_members (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(league_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_league_members_league_id ON public.league_members (league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user_id ON public.league_members (user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league_user ON public.league_members (league_id, user_id);

-- Enable Row Level Security
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for league_members
DROP POLICY IF EXISTS "Users can view members in their leagues" ON public.league_members;
CREATE POLICY "Users can view members in their leagues" ON public.league_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leagues 
            WHERE id = league_id AND auth.uid() = ANY(member_ids)
        )
    );

DROP POLICY IF EXISTS "League creators can manage members" ON public.league_members;
CREATE POLICY "League creators can manage members" ON public.league_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.leagues 
            WHERE id = league_id AND creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert themselves as members" ON public.league_members;
CREATE POLICY "Users can insert themselves as members" ON public.league_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to add a user to a league with their display name
CREATE OR REPLACE FUNCTION public.add_user_to_league(
    p_league_id UUID,
    p_user_id UUID,
    p_display_name TEXT,
    p_email TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Insert into league_members table
    INSERT INTO public.league_members (league_id, user_id, display_name, email)
    VALUES (p_league_id, p_user_id, p_display_name, p_email)
    ON CONFLICT (league_id, user_id) 
    DO UPDATE SET 
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get league member display names
CREATE OR REPLACE FUNCTION public.get_league_member_names(p_league_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT lm.user_id, lm.display_name, lm.email
    FROM public.league_members lm
    WHERE lm.league_id = p_league_id
    ORDER BY lm.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 