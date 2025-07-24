-- Fix missing functions and tables causing 406/404 errors

-- 1. Create missing league_coin_balances table
CREATE TABLE IF NOT EXISTS public.league_coin_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    coin_balance INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, league_id)
);

-- 2. Create missing marketplace_turns table
CREATE TABLE IF NOT EXISTS public.marketplace_turns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    current_user_id UUID REFERENCES public.users(id),
    turn_order UUID[] NOT NULL,
    current_turn_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create missing functions

-- Function to get current marketplace turn
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

-- Function to initialize league coin balance
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

-- Function to start marketplace
CREATE OR REPLACE FUNCTION public.start_marketplace(p_league_id UUID)
RETURNS JSON AS $$
DECLARE
    league_record RECORD;
    member_ids UUID[];
    turn_record RECORD;
    result JSON;
BEGIN
    -- Get league info
    SELECT * INTO league_record
    FROM leagues
    WHERE id = p_league_id;
    
    IF league_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'League not found');
    END IF;
    
    -- Get member IDs
    SELECT ARRAY_AGG(user_id) INTO member_ids
    FROM league_members
    WHERE league_id = p_league_id;
    
    IF member_ids IS NULL OR array_length(member_ids, 1) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No members in league');
    END IF;
    
    -- Check if marketplace already exists
    SELECT * INTO turn_record
    FROM marketplace_turns
    WHERE league_id = p_league_id AND is_active = true;
    
    IF turn_record IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Marketplace already active');
    END IF;
    
    -- Create new marketplace turn
    INSERT INTO marketplace_turns (league_id, current_user_id, turn_order, current_turn_index, is_active)
    VALUES (p_league_id, member_ids[1], member_ids, 0, true);
    
    -- Update league
    UPDATE leagues
    SET marketplace_completed = false,
        marketplace_order = member_ids
    WHERE id = p_league_id;
    
    result := json_build_object(
        'success', true,
        'message', 'Marketplace started',
        'current_user_id', member_ids[1],
        'turn_order', member_ids
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_current_marketplace_turn(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_league_coin_balance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_marketplace(UUID) TO authenticated;

-- 5. Create RLS policies for new tables

-- league_coin_balances policies
ALTER TABLE public.league_coin_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own coin balances" ON public.league_coin_balances;
CREATE POLICY "Users can view their own coin balances" ON public.league_coin_balances
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own coin balances" ON public.league_coin_balances;
CREATE POLICY "Users can update their own coin balances" ON public.league_coin_balances
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own coin balances" ON public.league_coin_balances;
CREATE POLICY "Users can insert their own coin balances" ON public.league_coin_balances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- marketplace_turns policies
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

-- 6. Add missing columns to existing tables if they don't exist

-- Add marketplace_completed to leagues if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leagues' AND column_name = 'marketplace_completed'
    ) THEN
        ALTER TABLE public.leagues ADD COLUMN marketplace_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add marketplace_order to leagues if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leagues' AND column_name = 'marketplace_order'
    ) THEN
        ALTER TABLE public.leagues ADD COLUMN marketplace_order UUID[];
    END IF;
END $$;

-- 7. Insert initial coin balances for existing users in the league
INSERT INTO league_coin_balances (user_id, league_id, coin_balance)
SELECT lm.user_id, lm.league_id, 100
FROM league_members lm
WHERE NOT EXISTS (
    SELECT 1 FROM league_coin_balances lcb 
    WHERE lcb.user_id = lm.user_id AND lcb.league_id = lm.league_id
); 