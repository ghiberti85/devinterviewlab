CREATE TABLE IF NOT EXISTS roadmap_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES study_roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE roadmap_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roadmap questions"
  ON roadmap_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roadmap questions"
  ON roadmap_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own roadmap questions"
  ON roadmap_questions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_roadmap_questions_roadmap_id ON roadmap_questions(roadmap_id);
CREATE INDEX idx_roadmap_questions_user_id ON roadmap_questions(user_id);
