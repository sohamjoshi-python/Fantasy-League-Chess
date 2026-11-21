-- Signed-in users could read every other user's email through the users table
-- (the SELECT policy is USING (true) so names and avatars can be shown). Column
-- privileges keep the rows readable but take the email column away from the
-- public API roles. Your own email comes from the auth session instead.
--
-- Apply only after the frontend that no longer runs users.select('*') is live.
-- New users columns must be added to this grant to be readable from the browser.

REVOKE SELECT ON public.users FROM anon, authenticated;

GRANT SELECT (
  id,
  username,
  coins,
  star_points,
  selected_avatar_url,
  created_at,
  updated_at,
  discord_user_id,
  sent_welcome_email,
  last_active_at
) ON public.users TO anon, authenticated;
