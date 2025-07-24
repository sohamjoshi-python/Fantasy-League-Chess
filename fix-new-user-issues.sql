-- Fix issues for new user joining the league

-- 1. First, let's check if the new user exists in the users table
SELECT id, email, username FROM users WHERE id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID;

-- 2. Add the new user to the users table if they don't exist
INSERT INTO users (id, email, username, coins, star_points, selected_avatar_url, created_at, updated_at)
SELECT 
    'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID,
    'newuser@example.com', -- You'll need to replace this with the actual email
    'NewUser',
    100,
    50,
    NULL,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
);

-- 3. Add the new user to league_members if they're not already there
INSERT INTO league_members (user_id, league_id, display_name, joined_at)
SELECT 
    'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID,
    '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID,
    'NewUser',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM league_members 
    WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID 
    AND league_id = '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID
);

-- 4. Fix the initialize_league_coin_balance function with correct parameter order
DROP FUNCTION IF EXISTS public.initialize_league_coin_balance(UUID, UUID);

CREATE OR REPLACE FUNCTION public.initialize_league_coin_balance(p_user_id UUID, p_league_id UUID)
RETURNS JSON AS $$
DECLARE
    existing_balance RECORD;
    result JSON;
BEGIN
    -- Check if balance already exists
    SELECT * INTO existing_balance
    FROM league_coin_balances
    WHERE user_id = p_user_id AND league_id = p_league_id;
    
    IF existing_balance IS NULL THEN
        -- Insert new balance
        INSERT INTO league_coin_balances (user_id, league_id, coin_balance)
        VALUES (p_user_id, p_league_id, 100);
        
        result := json_build_object(
            'success', true,
            'message', 'Coin balance initialized',
            'coin_balance', 100
        );
    ELSE
        result := json_build_object(
            'success', true,
            'message', 'Coin balance already exists',
            'coin_balance', existing_balance.coin_balance
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.initialize_league_coin_balance(UUID, UUID) TO authenticated;

-- 6. Add the new user to league_coin_balances
INSERT INTO league_coin_balances (user_id, league_id, coin_balance)
SELECT 
    'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID,
    '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID,
    100
WHERE NOT EXISTS (
    SELECT 1 FROM league_coin_balances 
    WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID 
    AND league_id = '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID
);

-- 7. Add a lineup record for the new user
INSERT INTO lineups (user_id, league_id, player_ids, week_start_date, week_end_date, points)
SELECT 
    'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID,
    '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID,
    '{}',
    '2025-07-21'::DATE,
    '2025-07-27'::DATE,
    0
WHERE NOT EXISTS (
    SELECT 1 FROM lineups 
    WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID 
    AND league_id = '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID
    AND week_start_date = '2025-07-21'::DATE
);

-- 8. Add a team record for the new user
INSERT INTO teams (user_id, league_id, player_ids)
SELECT 
    'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID,
    '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID,
    '{}'
WHERE NOT EXISTS (
    SELECT 1 FROM teams 
    WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID 
    AND league_id = '3a55e4fe-3f80-4c96-8dc6-d429c2c7530f'::UUID
);

-- 9. Verify the data was inserted
SELECT 'users' as table_name, COUNT(*) as record_count FROM users WHERE id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
UNION ALL
SELECT 'league_members' as table_name, COUNT(*) as record_count FROM league_members WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
UNION ALL
SELECT 'league_coin_balances' as table_name, COUNT(*) as record_count FROM league_coin_balances WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
UNION ALL
SELECT 'lineups' as table_name, COUNT(*) as record_count FROM lineups WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID
UNION ALL
SELECT 'teams' as table_name, COUNT(*) as record_count FROM teams WHERE user_id = 'cfeded2c-8e7c-478f-bfd3-600a0574e524'::UUID; 