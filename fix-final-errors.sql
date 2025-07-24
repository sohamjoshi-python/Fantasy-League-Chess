-- Fix final errors: turn_number column and lineups RLS

-- 1. Add turn_number column to marketplace_turns
ALTER TABLE public.marketplace_turns 
ADD COLUMN IF NOT EXISTS turn_number INTEGER DEFAULT 1;

-- 2. Fix lineups table RLS policies
-- First, let's check what policies exist and recreate them properly
DROP POLICY IF EXISTS "Users can view their own lineups" ON public.lineups;
DROP POLICY IF EXISTS "Users can create their own lineups" ON public.lineups;
DROP POLICY IF EXISTS "Users can update their own lineups" ON public.lineups;
DROP POLICY IF EXISTS "Users can delete their own lineups" ON public.lineups;

-- Recreate lineups policies with proper conditions
CREATE POLICY "Users can view their own lineups" ON public.lineups
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lineups" ON public.lineups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lineups" ON public.lineups
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lineups" ON public.lineups
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Make sure lineups table has RLS enabled
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

-- 4. Update the marketplace_turns table to use created_at for ordering instead of turn_number
-- This is a temporary fix - we'll add turn_number but the frontend should use created_at
UPDATE marketplace_turns 
SET turn_number = EXTRACT(EPOCH FROM created_at)::INTEGER
WHERE turn_number IS NULL;

-- 5. Create a function to get turn history properly
CREATE OR REPLACE FUNCTION public.get_marketplace_turn_history(p_league_id UUID)
RETURNS JSON AS $$
DECLARE
    turn_records RECORD[];
    result JSON;
BEGIN
    SELECT ARRAY_AGG(
        json_build_object(
            'id', mt.id,
            'current_user_id', mt.current_user_id,
            'turn_order', mt.turn_order,
            'current_turn_index', mt.current_turn_index,
            'is_active', mt.is_active,
            'created_at', mt.created_at,
            'turn_number', mt.turn_number
        )
    ) INTO turn_records
    FROM marketplace_turns mt
    WHERE mt.league_id = p_league_id
    ORDER BY mt.created_at DESC
    LIMIT 20;
    
    IF turn_records IS NULL THEN
        result := json_build_object('turns', '[]'::json);
    ELSE
        result := json_build_object('turns', turn_records);
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_marketplace_turn_history(UUID) TO authenticated;

-- 7. Insert a sample lineup record to test the RLS
-- This will help us verify that the lineups table is working
INSERT INTO lineups (user_id, league_id, player_ids, week_start_date, week_end_date, points)
SELECT 
    '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID,
    '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID,
    '{}',
    '2025-07-21'::DATE,
    '2025-07-27'::DATE,
    0
WHERE NOT EXISTS (
    SELECT 1 FROM lineups 
    WHERE user_id = '4a6364e1-426c-4c37-9fe3-b3eab4cf1425'::UUID 
    AND league_id = '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID
    AND week_start_date = '2025-07-21'::DATE
); 