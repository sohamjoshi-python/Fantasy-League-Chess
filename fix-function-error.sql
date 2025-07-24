-- Fix the get_marketplace_turn_history function

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.get_marketplace_turn_history(UUID);

-- Create a simpler version that returns JSON directly
CREATE OR REPLACE FUNCTION public.get_marketplace_turn_history(p_league_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Use json_agg to build the result directly
    SELECT json_build_object(
        'turns', COALESCE(
            json_agg(
                json_build_object(
                    'id', mt.id,
                    'current_user_id', mt.current_user_id,
                    'turn_order', mt.turn_order,
                    'current_turn_index', mt.current_turn_index,
                    'is_active', mt.is_active,
                    'created_at', mt.created_at,
                    'turn_number', mt.turn_number
                )
            ),
            '[]'::json
        )
    ) INTO result
    FROM marketplace_turns mt
    WHERE mt.league_id = p_league_id
    ORDER BY mt.created_at DESC
    LIMIT 20;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_marketplace_turn_history(UUID) TO authenticated; 