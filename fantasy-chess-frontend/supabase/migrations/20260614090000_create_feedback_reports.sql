CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('feedback', 'bug')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email TEXT,
  liked TEXT,
  confused TEXT,
  would_recommend BOOLEAN,
  feature_request TEXT,
  message TEXT,
  bug_title TEXT,
  bug_severity TEXT CHECK (bug_severity IS NULL OR bug_severity IN ('low', 'medium', 'high', 'critical')),
  page_url TEXT,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_reports_feedback_has_content CHECK (
    report_type <> 'feedback'
    OR liked IS NOT NULL
    OR feature_request IS NOT NULL
    OR would_recommend IS NOT NULL
    OR message IS NOT NULL
  ),
  CONSTRAINT feedback_reports_bug_has_content CHECK (
    report_type <> 'bug'
    OR (bug_title IS NOT NULL AND actual_behavior IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_created_at
  ON public.feedback_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_type_status
  ON public.feedback_reports(report_type, status);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit feedback reports" ON public.feedback_reports;
CREATE POLICY "Anyone can submit feedback reports"
  ON public.feedback_reports
  FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own feedback reports" ON public.feedback_reports;
CREATE POLICY "Users can view their own feedback reports"
  ON public.feedback_reports
  FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_feedback_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_feedback_reports_updated_at ON public.feedback_reports;
CREATE TRIGGER set_feedback_reports_updated_at
  BEFORE UPDATE ON public.feedback_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_feedback_reports_updated_at();
