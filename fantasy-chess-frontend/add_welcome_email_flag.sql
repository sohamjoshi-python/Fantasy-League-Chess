-- Add sent_welcome_email column to users table
-- This will track whether the welcome email has been sent to prevent duplicate emails

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS sent_welcome_email BOOLEAN DEFAULT FALSE;

-- Update existing users to have sent_welcome_email = TRUE
-- This prevents sending welcome emails to existing users
UPDATE users 
SET sent_welcome_email = TRUE 
WHERE sent_welcome_email IS NULL OR sent_welcome_email = FALSE;

-- Add a comment to explain the column
COMMENT ON COLUMN users.sent_welcome_email IS 'Tracks whether welcome email has been sent to prevent duplicate emails';
