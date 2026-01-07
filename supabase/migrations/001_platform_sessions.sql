-- Platform Sessions Table for storing browser cookies
-- Used by funpost-automation server for Tistory/Naver blog automation

CREATE TABLE IF NOT EXISTS platform_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tistory', 'naver')),
  cookies TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_platform_sessions_user ON platform_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_expires ON platform_sessions(expires_at);

-- RLS Policies
ALTER TABLE platform_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON platform_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON platform_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON platform_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON platform_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for automation server
CREATE POLICY "Service role full access" ON platform_sessions
  FOR ALL USING (auth.role() = 'service_role');
