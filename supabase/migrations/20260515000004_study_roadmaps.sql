CREATE TABLE IF NOT EXISTS study_roadmaps (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  job_title        text CHECK (char_length(job_title) <= 200),
  job_description  text CHECK (char_length(job_description) <= 8000),
  cv_text_snapshot text CHECK (char_length(cv_text_snapshot) <= 20000),
  gap_analysis     jsonb NOT NULL,
  roadmap          jsonb NOT NULL,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS roadmap_topic_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id        uuid REFERENCES study_roadmaps(id) ON DELETE CASCADE NOT NULL,
  user_id           uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  topic_name        text NOT NULL,
  questions_done    int NOT NULL DEFAULT 0,
  questions_goal    int NOT NULL DEFAULT 5,
  last_practiced_at timestamptz,
  created_at        timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE study_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_topic_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roadmaps_select" ON study_roadmaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "roadmaps_insert" ON study_roadmaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "roadmaps_update" ON study_roadmaps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "roadmaps_delete" ON study_roadmaps FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "roadmap_progress_select" ON roadmap_topic_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "roadmap_progress_insert" ON roadmap_topic_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "roadmap_progress_update" ON roadmap_topic_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX roadmaps_user_id_idx ON study_roadmaps(user_id);
CREATE INDEX roadmap_progress_roadmap_id_idx ON roadmap_topic_progress(roadmap_id);
