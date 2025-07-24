-- Fix join code functionality

-- 1. First, let's check if join_code column exists in leagues table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leagues' AND column_name = 'join_code';

-- 2. Add join_code column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leagues' AND column_name = 'join_code'
    ) THEN
        ALTER TABLE public.leagues ADD COLUMN join_code TEXT;
    END IF;
END $$;

-- 3. Create a function to generate join codes
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_already BOOLEAN;
BEGIN
    LOOP
        -- Generate a 6-character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 6));
        
        -- Check if this code already exists
        SELECT EXISTS(SELECT 1 FROM leagues WHERE join_code = code) INTO exists_already;
        
        -- If code doesn't exist, return it
        IF NOT exists_already THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update existing leagues to have join codes if they don't have them
UPDATE leagues 
SET join_code = generate_join_code()
WHERE join_code IS NULL;

-- 5. Create a policy to allow searching leagues by join code
DROP POLICY IF EXISTS "Anyone can search leagues by join code" ON public.leagues;
CREATE POLICY "Anyone can search leagues by join code" ON public.leagues
    FOR SELECT USING (true);

-- 6. Let's also make sure the existing policies allow join code searches
-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'leagues';

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.generate_join_code() TO authenticated;

-- 8. Let's see what leagues exist and their join codes
SELECT id, name, join_code, creator_id FROM leagues LIMIT 10; 