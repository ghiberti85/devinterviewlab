-- Add question_type to roadmap_questions: 'theoretical' | 'live_coding'
ALTER TABLE roadmap_questions
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'theoretical';
