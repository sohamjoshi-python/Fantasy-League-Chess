-- Add discord_role_id column to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS discord_role_id TEXT;

-- Drop existing function first
DROP FUNCTION IF EXISTS update_league_discord_info(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_league_discord_info(UUID);

-- Update the existing function to handle role management
CREATE OR REPLACE FUNCTION update_league_discord_info(
  p_league_id UUID,
  p_discord_server_id TEXT,
  p_discord_invite_link TEXT,
  p_discord_role_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE leagues 
  SET 
    discord_server_id = p_discord_server_id,
    discord_invite_link = p_discord_invite_link,
    discord_role_id = COALESCE(p_discord_role_id, discord_role_id)
  WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get league Discord info including role ID
CREATE OR REPLACE FUNCTION get_league_discord_info(p_league_id UUID)
RETURNS TABLE(
  discord_server_id TEXT,
  discord_invite_link TEXT,
  discord_role_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.discord_server_id,
    l.discord_invite_link,
    l.discord_role_id
  FROM leagues l
  WHERE l.id = p_league_id;
END;
$$ LANGUAGE plpgsql; 