-- Migration: Add program management tables
-- Run against Supabase SQL editor

-- Programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 80,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program sections
CREATE TABLE program_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  estimated_minutes INTEGER DEFAULT 15,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, slug)
);

-- Content blocks within sections
CREATE TABLE program_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES program_sections(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  block_type TEXT NOT NULL CHECK (block_type IN ('text', 'callout', 'table', 'quote', 'video')),
  content TEXT,
  variant TEXT CHECK (variant IN ('info', 'warning', 'tip', 'youtube', 'uploaded')),
  headers JSONB,
  rows JSONB,
  attribution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises within sections
CREATE TABLE program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES program_sections(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('multiple_choice', 'voice', 'short_answer')),
  question TEXT,
  options JSONB,
  correct_index INTEGER,
  explanation TEXT,
  scenario TEXT,
  guidance TEXT,
  ai_prompt TEXT,
  sample_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment questions for a program
CREATE TABLE program_assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  module_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trainee-program enrollments
CREATE TABLE trainee_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainee_id, program_id)
);

-- Indexes
CREATE INDEX idx_program_sections_program_id ON program_sections(program_id);
CREATE INDEX idx_program_sections_sort ON program_sections(program_id, sort_order);
CREATE INDEX idx_program_content_blocks_section_id ON program_content_blocks(section_id);
CREATE INDEX idx_program_content_blocks_sort ON program_content_blocks(section_id, sort_order);
CREATE INDEX idx_program_exercises_section_id ON program_exercises(section_id);
CREATE INDEX idx_program_exercises_sort ON program_exercises(section_id, sort_order);
CREATE INDEX idx_program_assessment_questions_program_id ON program_assessment_questions(program_id);
CREATE INDEX idx_program_assessment_questions_sort ON program_assessment_questions(program_id, sort_order);
CREATE INDEX idx_trainee_programs_trainee_id ON trainee_programs(trainee_id);
CREATE INDEX idx_trainee_programs_program_id ON trainee_programs(program_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_sections_updated_at
  BEFORE UPDATE ON program_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_content_blocks_updated_at
  BEFORE UPDATE ON program_content_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_exercises_updated_at
  BEFORE UPDATE ON program_exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_assessment_questions_updated_at
  BEFORE UPDATE ON program_assessment_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (using service role key bypasses RLS, but set up for safety)
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainee_programs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (our API uses service role key)
CREATE POLICY "Service role full access on programs"
  ON programs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on program_sections"
  ON program_sections FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on program_content_blocks"
  ON program_content_blocks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on program_exercises"
  ON program_exercises FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on program_assessment_questions"
  ON program_assessment_questions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on trainee_programs"
  ON trainee_programs FOR ALL USING (true) WITH CHECK (true);
