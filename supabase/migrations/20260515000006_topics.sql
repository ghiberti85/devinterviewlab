CREATE TABLE IF NOT EXISTS topics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id   uuid REFERENCES categories(id) ON DELETE SET NULL,
  title         text NOT NULL CHECK (char_length(title) <= 200),
  difficulty    text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  summary       text NOT NULL CHECK (char_length(summary) <= 2000),
  when_to_use   text CHECK (char_length(when_to_use) <= 1000),
  code_snippet  text CHECK (char_length(code_snippet) <= 3000),
  quick_qa      jsonb NOT NULL DEFAULT '[]',
  tags          text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_select" ON topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "topics_insert" ON topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "topics_delete" ON topics FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX topics_user_id_idx ON topics(user_id);
CREATE INDEX topics_created_at_idx ON topics(created_at DESC);
