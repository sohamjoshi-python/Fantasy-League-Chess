-- Fix RLS policy on users table to allow league members to read each other's usernames
-- Run this in your Supabase SQL editor

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

-- Create a new policy that allows users to read their own data AND other users' data if they're in the same league
CREATE POLICY "Users can view their own data and league members" ON public.users
    FOR SELECT USING (
        auth.uid() = users.id OR 
        EXISTS (
            SELECT 1 FROM public.league_members lm1
            JOIN public.league_members lm2 ON lm1.league_id = lm2.league_id
            WHERE lm1.user_id = auth.uid() 
            AND lm2.user_id = users.id
        )
    );

-- Keep the existing update policy
-- DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
-- CREATE POLICY "Users can update their own data" ON public.users
--     FOR UPDATE USING (auth.uid() = id);

-- Verify the policy was created
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname; 