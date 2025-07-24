-- Enhanced Email System Database Schema
-- This adds comprehensive email functionality with HTML templates, scheduling, and analytics

-- 1. Email tracking table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  template_id TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT,
  text_content TEXT,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- 2. Email scheduling table
CREATE TABLE IF NOT EXISTS email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Email events tracking table
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click', 'bounce', 'spam_report')),
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. User email preferences table
CREATE TABLE IF NOT EXISTS user_email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  weekly_results BOOLEAN DEFAULT TRUE,
  league_start BOOLEAN DEFAULT TRUE,
  draft_reminders BOOLEAN DEFAULT TRUE,
  lineup_reminders BOOLEAN DEFAULT TRUE,
  marketplace_alerts BOOLEAN DEFAULT TRUE,
  coin_distributions BOOLEAN DEFAULT TRUE,
  league_end BOOLEAN DEFAULT TRUE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_league_id ON emails(league_id);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_emails_template_id ON emails(template_id);

CREATE INDEX IF NOT EXISTS idx_email_schedules_user_id ON email_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON email_schedules(status);
CREATE INDEX IF NOT EXISTS idx_email_schedules_scheduled_for ON email_schedules(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_email_events_email_id ON email_events(email_id);
CREATE INDEX IF NOT EXISTS idx_email_events_user_id ON email_events(user_id);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emails table
CREATE POLICY "users_can_read_own_emails" ON emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_role_can_manage_emails" ON emails
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for email_schedules table
CREATE POLICY "users_can_read_own_email_schedules" ON email_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_role_can_manage_email_schedules" ON email_schedules
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for email_events table
CREATE POLICY "users_can_read_own_email_events" ON email_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_role_can_manage_email_events" ON email_events
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_email_preferences table
CREATE POLICY "users_can_manage_own_email_preferences" ON user_email_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Functions for email management

-- Function to create user email preferences
CREATE OR REPLACE FUNCTION create_user_email_preferences(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_email_preferences (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update email preferences
CREATE OR REPLACE FUNCTION update_email_preferences(
  p_user_id UUID,
  p_email_enabled BOOLEAN DEFAULT NULL,
  p_weekly_results BOOLEAN DEFAULT NULL,
  p_league_start BOOLEAN DEFAULT NULL,
  p_draft_reminders BOOLEAN DEFAULT NULL,
  p_lineup_reminders BOOLEAN DEFAULT NULL,
  p_marketplace_alerts BOOLEAN DEFAULT NULL,
  p_coin_distributions BOOLEAN DEFAULT NULL,
  p_league_end BOOLEAN DEFAULT NULL,
  p_marketing_emails BOOLEAN DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_email_preferences (
    user_id, email_enabled, weekly_results, league_start, draft_reminders,
    lineup_reminders, marketplace_alerts, coin_distributions, league_end, marketing_emails
  ) VALUES (
    p_user_id, p_email_enabled, p_weekly_results, p_league_start, p_draft_reminders,
    p_lineup_reminders, p_marketplace_alerts, p_coin_distributions, p_league_end, p_marketing_emails
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email_enabled = COALESCE(p_email_enabled, user_email_preferences.email_enabled),
    weekly_results = COALESCE(p_weekly_results, user_email_preferences.weekly_results),
    league_start = COALESCE(p_league_start, user_email_preferences.league_start),
    draft_reminders = COALESCE(p_draft_reminders, user_email_preferences.draft_reminders),
    lineup_reminders = COALESCE(p_lineup_reminders, user_email_preferences.lineup_reminders),
    marketplace_alerts = COALESCE(p_marketplace_alerts, user_email_preferences.marketplace_alerts),
    coin_distributions = COALESCE(p_coin_distributions, user_email_preferences.coin_distributions),
    league_end = COALESCE(p_league_end, user_email_preferences.league_end),
    marketing_emails = COALESCE(p_marketing_emails, user_email_preferences.marketing_emails),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user wants specific email type
CREATE OR REPLACE FUNCTION should_send_email(user_id UUID, email_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  preferences RECORD;
BEGIN
  SELECT * INTO preferences FROM user_email_preferences WHERE user_email_preferences.user_id = should_send_email.user_id;
  
  -- If no preferences exist, default to true
  IF preferences IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if emails are globally disabled
  IF NOT preferences.email_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check specific email type preference
  CASE email_type
    WHEN 'weekly_results' THEN RETURN preferences.weekly_results;
    WHEN 'league_start' THEN RETURN preferences.league_start;
    WHEN 'draft_reminders' THEN RETURN preferences.draft_reminders;
    WHEN 'lineup_reminders' THEN RETURN preferences.lineup_reminders;
    WHEN 'marketplace_alerts' THEN RETURN preferences.marketplace_alerts;
    WHEN 'coin_distributions' THEN RETURN preferences.coin_distributions;
    WHEN 'league_end' THEN RETURN preferences.league_end;
    WHEN 'marketing_emails' THEN RETURN preferences.marketing_emails;
    ELSE RETURN TRUE; -- Default to true for unknown types
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process scheduled emails
CREATE OR REPLACE FUNCTION process_scheduled_emails()
RETURNS JSON AS $$
DECLARE
  scheduled_email RECORD;
  processed_count INTEGER := 0;
  failed_count INTEGER := 0;
  result JSON;
BEGIN
  -- Process all pending emails that are due
  FOR scheduled_email IN 
    SELECT * FROM email_schedules 
    WHERE status = 'pending' AND scheduled_for <= NOW()
  LOOP
    BEGIN
      -- Update status to processing
      UPDATE email_schedules 
      SET status = 'processing' 
      WHERE id = scheduled_email.id;
      
      -- Here you would call the email sending function
      -- For now, we'll just mark as sent
      UPDATE email_schedules 
      SET status = 'sent', sent_at = NOW() 
      WHERE id = scheduled_email.id;
      
      processed_count := processed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed
      UPDATE email_schedules 
      SET status = 'failed', error_message = SQLERRM 
      WHERE id = scheduled_email.id;
      
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'processed', processed_count,
    'failed', failed_count,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get email statistics for a user
CREATE OR REPLACE FUNCTION get_user_email_stats(user_id UUID, days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  stats RECORD;
  result JSON;
BEGIN
  SELECT 
    COUNT(*) as total_emails,
    COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened_emails,
    COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked_emails,
    ROUND(
      (COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as open_rate,
    ROUND(
      (COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as click_rate
  INTO stats
  FROM emails 
  WHERE emails.user_id = get_user_email_stats.user_id 
    AND sent_at >= NOW() - INTERVAL '1 day' * days;
  
  result := json_build_object(
    'total_emails', stats.total_emails,
    'opened_emails', stats.opened_emails,
    'clicked_emails', stats.clicked_emails,
    'open_rate', stats.open_rate,
    'click_rate', stats.click_rate
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track email open
CREATE OR REPLACE FUNCTION track_email_open(email_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update email opened timestamp
  UPDATE emails 
  SET opened_at = NOW() 
  WHERE id = track_email_open.email_id;
  
  -- Record event
  INSERT INTO email_events (email_id, event_type, timestamp)
  VALUES (track_email_open.email_id, 'open', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track email click
CREATE OR REPLACE FUNCTION track_email_click(email_id UUID, link_url TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- Update email clicked timestamp
  UPDATE emails 
  SET clicked_at = NOW() 
  WHERE id = track_email_click.email_id;
  
  -- Record event
  INSERT INTO email_events (email_id, event_type, metadata, timestamp)
  VALUES (track_email_click.email_id, 'click', json_build_object('link_url', link_url), NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_email_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_email_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_email(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_scheduled_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION track_email_open(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_email_click(UUID, TEXT) TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON emails TO authenticated;
GRANT SELECT, INSERT, UPDATE ON email_schedules TO authenticated;
GRANT SELECT, INSERT ON email_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_email_preferences TO authenticated;

-- Create trigger to create email preferences for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create email preferences for new user
  PERFORM create_user_email_preferences(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert default email preferences for existing users
INSERT INTO user_email_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING; 