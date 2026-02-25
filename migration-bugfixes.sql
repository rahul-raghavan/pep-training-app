-- Migration: Add program_id to assessment_attempts for program scoping
-- Run this in Supabase SQL Editor before deploying

ALTER TABLE assessment_attempts ADD COLUMN program_id UUID REFERENCES programs(id);
CREATE INDEX idx_assessment_attempts_program_id ON assessment_attempts(program_id);
