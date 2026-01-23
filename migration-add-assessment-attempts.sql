-- Migration: Add assessment_attempts table
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  answers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_trainee_id ON assessment_attempts(trainee_id);

ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on assessment_attempts" ON assessment_attempts FOR ALL USING (true);
