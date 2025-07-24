-- Fix remaining errors: marketplace_turns table and lineups columns

-- 1. Drop and recreate marketplace_turns table properly
DROP TABLE IF EXISTS public.marketplace_turns CASCADE;

CREATE TABLE public.marketplace_turns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    current_user_id UUID REFERENCES public.users(id),
    turn_order UUID[] NOT NULL,
    current_turn_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns to lineups table
DO $$
BEGIN
    -- Add week_start_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lineups' AND column_name = 'week_start_date'
    ) THEN
        ALTER TABLE public.lineups ADD COLUMN week_start_date DATE;
    END IF;
    
    -- Add week_end_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lineups' AND column_name = 'week_end_date'
    ) THEN
        ALTER TABLE public.lineups ADD COLUMN week_end_date DATE;
    END IF;
    
    -- Add points if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lineups' AND column_name = 'points'
    ) THEN
        ALTER TABLE public.lineups ADD COLUMN points INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Recreate the get_current_marketplace_turn function
CREATE OR REPLACE FUNCTION public.get_current_marketplace_turn(p_league_id UUID)
RETURNS JSON AS $$
DECLARE
    turn_record RECORD;
    result JSON;
BEGIN
    SELECT * INTO turn_record
    FROM marketplace_turns
    WHERE league_id = p_league_id AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF turn_record IS NULL THEN
        result := json_build_object(
            'current_user_id', NULL,
            'turn_order', '[]'::json,
            'current_turn_index', 0,
            'is_active', false
        );
    ELSE
        result := json_build_object(
            'current_user_id', turn_record.current_user_id,
            'turn_order', turn_record.turn_order,
            'current_turn_index', turn_record.current_turn_index,
            'is_active', turn_record.is_active
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate RLS policies for marketplace_turns
ALTER TABLE public.marketplace_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League members can view marketplace turns" ON public.marketplace_turns;
CREATE POLICY "League members can view marketplace turns" ON public.marketplace_turns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM league_members 
            WHERE league_id = marketplace_turns.league_id 
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "League creators can manage marketplace turns" ON public.marketplace_turns;
CREATE POLICY "League creators can manage marketplace turns" ON public.marketplace_turns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE id = marketplace_turns.league_id 
            AND creator_id = auth.uid()
        )
    );

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_current_marketplace_turn(UUID) TO authenticated;

-- 6. Insert some sample data for testing (optional)
-- This will create a marketplace turn for your league if it doesn't exist
INSERT INTO marketplace_turns (league_id, current_user_id, turn_order, current_turn_index, is_active)
SELECT 
    '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID,
    lm.user_id,
    ARRAY_AGG(lm.user_id),
    0,
    true
FROM league_members lm
WHERE lm.league_id = '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID
GROUP BY lm.user_id
LIMIT 1
ON CONFLICT DO NOTHING; 