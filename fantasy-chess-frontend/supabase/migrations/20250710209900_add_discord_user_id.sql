-- Add Discord user ID column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_discord_user_id ON users(discord_user_id);

-- Add comment for documentation
COMMENT ON COLUMN users.discord_user_id IS 'Discord user ID for automatic email association'; 