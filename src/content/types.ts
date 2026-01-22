// Content block types
export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'callout'; variant: 'info' | 'warning' | 'tip'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'quote'; content: string; attribution?: string };

// Exercise types
export type MultipleChoiceExercise = {
  type: 'multiple_choice';
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type ShortAnswerExercise = {
  type: 'short_answer';
  id: string;
  question: string;
  sampleAnswer: string;
};

export type VoiceExercise = {
  type: 'voice';
  id: string;
  scenario: string;
  guidance: string;
  aiPrompt: string;
};

export type Exercise = MultipleChoiceExercise | ShortAnswerExercise | VoiceExercise;

// Section type
export type Section = {
  id: string;
  title: string;
  estimatedMinutes: number;
  content: ContentBlock[];
  exercises: Exercise[];
};

// Database types
export type Trainee = {
  id: string;
  name: string;
  email?: string;
  access_token: string;
  created_at: string;
  last_active_at?: string;
};

export type Progress = {
  id: string;
  trainee_id: string;
  section_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
};

export type Response = {
  id: string;
  trainee_id: string;
  section_id: string;
  exercise_id: string;
  exercise_type: 'multiple_choice' | 'short_answer' | 'voice';
  response_text?: string;
  audio_url?: string;
  ai_feedback?: string;
  ai_score?: number;
  created_at: string;
};
