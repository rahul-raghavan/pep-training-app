-- PEP Training App Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trainees table
CREATE TABLE trainees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  access_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE
);

-- Progress tracking per section
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(trainee_id, section_id)
);

-- Individual responses (knowledge checks + voice exercises)
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('multiple_choice', 'short_answer', 'voice')),
  response_text TEXT,
  audio_url TEXT,
  ai_feedback TEXT,
  ai_score INTEGER CHECK (ai_score >= 1 AND ai_score <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_trainees_access_token ON trainees(access_token);
CREATE INDEX idx_progress_trainee_id ON progress(trainee_id);
CREATE INDEX idx_responses_trainee_id ON responses(trainee_id);
CREATE INDEX idx_responses_section_id ON responses(section_id);

-- Enable Row Level Security (RLS)
ALTER TABLE trainees ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (using service role key)
-- In production, you might want more restrictive policies
CREATE POLICY "Allow all operations on trainees" ON trainees FOR ALL USING (true);
CREATE POLICY "Allow all operations on progress" ON progress FOR ALL USING (true);
CREATE POLICY "Allow all operations on responses" ON responses FOR ALL USING (true);

-- Create storage bucket for audio recordings
-- Note: Run this separately in the Supabase Storage settings or via the API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true);
