-- Add transcript column to ai_evaluations
-- Stores the original spoken/typed text that was evaluated, enabling answer history review.
ALTER TABLE ai_evaluations
  ADD COLUMN IF NOT EXISTS transcript text CHECK (char_length(transcript) <= 50000);
