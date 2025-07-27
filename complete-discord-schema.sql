-- Complete Discord Integration Database Schema
-- Add Discord-related fields to existing tables

-- Step 1: Add max_members column to leagues table (if it doesn't exist)
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 10;

-- Step 2: Add Discord fields to leagues table
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS discord_server_id TEXT,
ADD COLUMN IF NOT EXISTS discord_invite_link TEXT;

-- Step 3: Add Discord user ID to users table (optional for future Discord account linking)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

-- Step 4: Create index for Discord server lookups
CREATE INDEX IF NOT EXISTS idx_leagues_discord_server_id ON leagues(discord_server_id);

-- Step 5: Create a function to update Discord server info when league is created
CREATE OR REPLACE FUNCTION update_league_discord_info(
  p_league_id UUID,
  p_discord_server_id TEXT,
  p_discord_invite_link TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE leagues 
  SET 
    discord_server_id = p_discord_server_id,
    discord_invite_link = p_discord_invite_link,
    updated_at = NOW()
  WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION update_league_discord_info(UUID, TEXT, TEXT) TO authenticated;

-- Step 7: Create a view for Discord server information
CREATE OR REPLACE VIEW league_discord_info AS
SELECT 
  l.id as league_id,
  l.name as league_name,
  l.discord_server_id,
  l.discord_invite_link,
  l.member_ids,
  array_length(l.member_ids, 1) as member_count,
  l.max_members,
  CASE 
    WHEN l.discord_server_id IS NOT NULL THEN true 
    ELSE false 
  END as has_discord_server
FROM leagues l;

-- Step 8: Grant permissions on the view
GRANT SELECT ON league_discord_info TO authenticated;

-- Step 9: Create a function to get Discord info for a league
CREATE OR REPLACE FUNCTION get_league_discord_info(p_league_id UUID)
RETURNS TABLE(
  league_id UUID,
  league_name TEXT,
  discord_server_id TEXT,
  discord_invite_link TEXT,
  member_count INTEGER,
  max_members INTEGER,
  has_discord_server BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.discord_server_id,
    l.discord_invite_link,
    array_length(l.member_ids, 1),
    l.max_members,
    CASE WHEN l.discord_server_id IS NOT NULL THEN true ELSE false END
  FROM leagues l
  WHERE l.id = p_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Grant permissions
GRANT EXECUTE ON FUNCTION get_league_discord_info(UUID) TO authenticated;

-- Step 11: Create a table to track Discord announcements
CREATE TABLE IF NOT EXISTS discord_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id),
  message TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  discord_message_id TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 12: Create indexes for Discord announcements
CREATE INDEX IF NOT EXISTS idx_discord_announcements_league_id ON discord_announcements(league_id);
CREATE INDEX IF NOT EXISTS idx_discord_announcements_sent_at ON discord_announcements(sent_at);

-- Step 13: Grant permissions on discord_announcements table
GRANT SELECT, INSERT, UPDATE ON discord_announcements TO authenticated;

-- Step 14: Create a function to log Discord announcements
CREATE OR REPLACE FUNCTION log_discord_announcement(
  p_league_id UUID,
  p_message TEXT,
  p_channel_name TEXT,
  p_discord_message_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  announcement_id UUID;
BEGIN
  INSERT INTO discord_announcements (
    league_id,
    message,
    channel_name,
    discord_message_id
  ) VALUES (
    p_league_id,
    p_message,
    p_channel_name,
    p_discord_message_id
  ) RETURNING id INTO announcement_id;
  
  RETURN announcement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Grant permissions
GRANT EXECUTE ON FUNCTION log_discord_announcement(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Step 16: Add comments for documentation
COMMENT ON COLUMN leagues.discord_server_id IS 'Discord server ID for this league';
COMMENT ON COLUMN leagues.discord_invite_link IS 'Discord invite link for this league';
COMMENT ON COLUMN users.discord_user_id IS 'Discord user ID for account linking (optional)';
COMMENT ON TABLE discord_announcements IS 'Log of Discord announcements sent to league servers';
COMMENT ON COLUMN discord_announcements.discord_message_id IS 'Discord message ID for tracking'; 