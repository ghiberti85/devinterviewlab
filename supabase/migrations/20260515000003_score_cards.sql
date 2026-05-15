CREATE TABLE IF NOT EXISTS score_cards (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_label    text CHECK (char_length(session_label) <= 200),
  evaluation_ids   uuid[] NOT NULL DEFAULT '{}',
  overall_score    numeric(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  radar            jsonb NOT NULL,
  strengths        text[] NOT NULL DEFAULT '{}',
  gaps             text[] NOT NULL DEFAULT '{}',
  missing_concepts text[] NOT NULL DEFAULT '{}',
  recommendation   text,
  created_at       timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE score_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "score_cards_select" ON score_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "score_cards_insert" ON score_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "score_cards_delete" ON score_cards FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX score_cards_user_id_idx ON score_cards(user_id);
CREATE INDEX score_cards_created_at_idx ON score_cards(created_at DESC);
