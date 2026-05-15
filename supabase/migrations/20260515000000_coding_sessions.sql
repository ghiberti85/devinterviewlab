-- Live Coding Simulator sessions
CREATE TABLE IF NOT EXISTS coding_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  problem_title       text NOT NULL CHECK (char_length(problem_title) <= 300),
  problem_description text CHECK (char_length(problem_description) <= 5000),
  language            varchar(50) NOT NULL DEFAULT 'javascript',
  code                text NOT NULL CHECK (char_length(code) <= 100000),
  score               numeric(5,2) CHECK (score >= 0 AND score <= 100),
  feedback            jsonb,
  time_spent_sec      int CHECK (time_spent_sec >= 0),
  timer_duration_sec  int CHECK (timer_duration_sec > 0),
  created_at          timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE coding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coding_sessions_select" ON coding_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "coding_sessions_insert" ON coding_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coding_sessions_delete" ON coding_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX coding_sessions_user_id_idx ON coding_sessions(user_id);
CREATE INDEX coding_sessions_created_at_idx ON coding_sessions(created_at DESC);
