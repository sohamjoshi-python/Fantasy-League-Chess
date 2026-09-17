-- Non-members cannot SELECT leagues (RLS), so join-by-code must go through this
-- SECURITY DEFINER lookup. PostgREST returns 404 if the function is missing.

CREATE OR REPLACE FUNCTION public.lookup_league_by_join_code(p_join_code text)
RETURNS SETOF public.leagues
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.leagues
  WHERE UPPER(join_code) = UPPER(TRIM(p_join_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_league_by_join_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_league_by_join_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_league_by_join_code(text) TO service_role;

NOTIFY pgrst, 'reload schema';
