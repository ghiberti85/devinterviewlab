-- Add bilingual support to concepts
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS translated_from UUID REFERENCES concepts(id);
