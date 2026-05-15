-- Add pair-programming hint tracking columns to coding_sessions
ALTER TABLE coding_sessions
  ADD COLUMN IF NOT EXISTS hints_requested int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hints_shown     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idle_pauses     int NOT NULL DEFAULT 0;
