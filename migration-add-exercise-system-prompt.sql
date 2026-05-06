-- Allow individual voice exercises to override the default feedback system prompt.
-- Used by STORYTELLING-101 to provide non-scored, fact-spine-aware feedback.

ALTER TABLE program_exercises
  ADD COLUMN IF NOT EXISTS system_prompt TEXT;
