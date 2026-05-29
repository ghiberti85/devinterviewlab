ALTER TABLE topics ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'pt'));
ALTER TABLE topics ADD COLUMN IF NOT EXISTS translated_from uuid REFERENCES topics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS topics_language_idx ON topics(language);
CREATE INDEX IF NOT EXISTS topics_translated_from_idx ON topics(translated_from);
