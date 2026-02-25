import { createAdminClient } from './supabase/admin';
import { ContentBlock, Exercise, Section } from '@/content/types';

// Database row types
export interface Program {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  passing_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgramSection {
  id: string;
  program_id: string;
  slug: string;
  title: string;
  estimated_minutes: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramContentBlock {
  id: string;
  section_id: string;
  sort_order: number;
  block_type: string;
  content: string | null;
  variant: string | null;
  headers: string[] | null;
  rows: string[][] | null;
  attribution: string | null;
}

export interface ProgramExercise {
  id: string;
  section_id: string;
  sort_order: number;
  exercise_type: string;
  question: string | null;
  options: string[] | null;
  correct_index: number | null;
  explanation: string | null;
  scenario: string | null;
  guidance: string | null;
  ai_prompt: string | null;
  sample_answer: string | null;
}

export interface ProgramAssessmentQuestion {
  id: string;
  program_id: string;
  sort_order: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  module_label: string | null;
}

export interface TraineeProgram {
  id: string;
  trainee_id: string;
  program_id: string;
  enrolled_at: string;
}

// --- Query functions ---

export async function getProgram(id: string): Promise<Program | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function getProgramBySlug(slug: string): Promise<Program | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

export async function listPrograms(): Promise<Program[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('programs')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getProgramSections(programId: string): Promise<ProgramSection[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('program_sections')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order');
  return data || [];
}

export async function getSectionBySlug(programId: string, sectionSlug: string): Promise<ProgramSection | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('program_sections')
    .select('*')
    .eq('program_id', programId)
    .eq('slug', sectionSlug)
    .single();
  if (error) return null;
  return data;
}

export async function getSectionWithContent(sectionId: string): Promise<{
  section: ProgramSection;
  contentBlocks: ProgramContentBlock[];
  exercises: ProgramExercise[];
} | null> {
  const supabase = createAdminClient();

  const { data: section, error } = await supabase
    .from('program_sections')
    .select('*')
    .eq('id', sectionId)
    .single();
  if (error || !section) return null;

  const [{ data: contentBlocks }, { data: exercises }] = await Promise.all([
    supabase
      .from('program_content_blocks')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order'),
    supabase
      .from('program_exercises')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order'),
  ]);

  return {
    section,
    contentBlocks: contentBlocks || [],
    exercises: exercises || [],
  };
}

export async function getProgramAssessment(programId: string): Promise<ProgramAssessmentQuestion[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('program_assessment_questions')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order');
  return data || [];
}

export async function getProgramTrainees(programId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('trainee_programs')
    .select('*, trainees(*)')
    .eq('program_id', programId);
  return data || [];
}

// --- Enrollment & lookup helpers ---

export async function isTraineeEnrolled(traineeId: string, programId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('trainee_programs')
    .select('id')
    .eq('trainee_id', traineeId)
    .eq('program_id', programId)
    .single();
  return !!data;
}

export async function getExerciseById(exerciseId: string): Promise<ProgramExercise | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('program_exercises')
    .select('*')
    .eq('id', exerciseId)
    .single();
  if (error) return null;
  return data;
}

export async function getProgramIdForSection(sectionId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('program_sections')
    .select('program_id')
    .eq('id', sectionId)
    .single();
  if (error || !data) return null;
  return data.program_id;
}

// --- Type converters (DB rows → existing component types) ---

export function dbBlockToContentBlock(row: ProgramContentBlock): ContentBlock {
  switch (row.block_type) {
    case 'text':
      return { type: 'text', content: row.content || '' };
    case 'callout':
      return {
        type: 'callout',
        variant: (row.variant as 'info' | 'warning' | 'tip') || 'info',
        content: row.content || '',
      };
    case 'table':
      return {
        type: 'table',
        headers: row.headers || [],
        rows: row.rows || [],
      };
    case 'quote':
      return {
        type: 'quote',
        content: row.content || '',
        attribution: row.attribution || undefined,
      };
    case 'video':
      return {
        type: 'video',
        url: row.content || '',
        source: (row.variant as 'youtube' | 'uploaded') || 'youtube',
        title: row.attribution || undefined,
      };
    default:
      return { type: 'text', content: row.content || '' };
  }
}

export function dbExerciseToExercise(row: ProgramExercise): Exercise {
  switch (row.exercise_type) {
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        id: row.id,
        question: row.question || '',
        options: row.options || [],
        correctIndex: row.correct_index ?? 0,
        explanation: row.explanation || '',
      };
    case 'voice':
      return {
        type: 'voice',
        id: row.id,
        scenario: row.scenario || '',
        guidance: row.guidance || '',
        aiPrompt: row.ai_prompt || '',
      };
    case 'short_answer':
      return {
        type: 'short_answer',
        id: row.id,
        question: row.question || '',
        sampleAnswer: row.sample_answer || '',
      };
    default:
      return {
        type: 'short_answer',
        id: row.id,
        question: row.question || '',
        sampleAnswer: row.sample_answer || '',
      };
  }
}

export function dbSectionToSection(
  section: ProgramSection,
  contentBlocks: ProgramContentBlock[],
  exercises: ProgramExercise[]
): Section {
  return {
    id: section.id,
    title: section.title,
    estimatedMinutes: section.estimated_minutes,
    content: contentBlocks.map(dbBlockToContentBlock),
    exercises: exercises.map(dbExerciseToExercise),
  };
}
