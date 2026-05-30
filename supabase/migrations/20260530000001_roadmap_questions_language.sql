-- Add language field to roadmap_questions
ALTER TABLE roadmap_questions ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';
