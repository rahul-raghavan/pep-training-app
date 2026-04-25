import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { isVoiceResponseInAdminScope } from '@/lib/admin-scope';

interface VoiceAttemptResponse {
  id: string;
  createdAt: string;
  score: number | null;
  transcription: string | null;
  audioUrl: string | null;
  rawFeedback: string | null;
  exercise: {
    id: string;
    scenario: string;
    guidance: string | null;
  };
  section: {
    id: string;
    title: string;
    slug: string;
  };
  course: {
    id: string;
    title: string;
    slug: string;
  };
  trainee: {
    id: string;
    name: string;
    email: string;
  };
  /** Other attempts on the same exercise by the same trainee, oldest → newest. */
  history: {
    id: string;
    score: number | null;
    createdAt: string;
    transcriptionExcerpt: string;
    isCurrent: boolean;
  }[];
}

/**
 * GET /api/admin/voice/[responseId]
 * Returns the response with full context for the admin blunt-review view.
 * Errors with 404 if the response isn't a voice exercise.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ responseId: string }> }
) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { responseId } = await params;
  const supabase = createAdminClient();

  const { data: response } = await supabase
    .from('responses')
    .select(
      'id, trainee_id, section_id, exercise_id, response_text, audio_url, ai_feedback, ai_score, exercise_type, created_at'
    )
    .eq('id', responseId)
    .single();

  if (!response) {
    return NextResponse.json({ error: 'Response not found' }, { status: 404 });
  }
  if (response.exercise_type !== 'voice') {
    return NextResponse.json(
      { error: 'Response is not a voice exercise' },
      { status: 400 }
    );
  }
  if (!(await isVoiceResponseInAdminScope(supabase, user, response))) {
    return NextResponse.json({ error: 'Voice response is not in your admin scope' }, { status: 403 });
  }

  // Exercise (scenario, guidance) — exercise_id may be either the program_exercises
  // UUID or a legacy hardcoded string. Try UUID lookup first.
  let exerciseRow: { id: string; scenario: string | null; guidance: string | null; section_id: string } | null = null;
  if (response.exercise_id) {
    const { data: ex } = await supabase
      .from('program_exercises')
      .select('id, scenario, guidance, section_id')
      .eq('id', response.exercise_id)
      .single();
    if (ex) exerciseRow = ex;
  }

  // Section + course context — section_id should be a UUID for new program flow.
  let sectionRow: { id: string; slug: string; title: string; program_id: string } | null = null;
  let courseRow: { id: string; slug: string; title: string } | null = null;
  if (response.section_id) {
    const { data: s } = await supabase
      .from('program_sections')
      .select('id, slug, title, program_id')
      .eq('id', response.section_id)
      .single();
    if (s) {
      sectionRow = s;
      const { data: c } = await supabase
        .from('programs')
        .select('id, slug, title')
        .eq('id', s.program_id)
        .single();
      if (c) courseRow = c;
    }
  }

  // Trainee
  const { data: traineeRow } = await supabase
    .from('trainees')
    .select('id, name, email')
    .eq('id', response.trainee_id)
    .single();

  // Other attempts on same exercise by same trainee
  const { data: history } = await supabase
    .from('responses')
    .select('id, ai_score, response_text, created_at')
    .eq('trainee_id', response.trainee_id)
    .eq('exercise_id', response.exercise_id)
    .eq('exercise_type', 'voice')
    .order('created_at', { ascending: true });

  const payload: VoiceAttemptResponse = {
    id: response.id,
    createdAt: response.created_at,
    score: response.ai_score,
    transcription: response.response_text,
    audioUrl: response.audio_url,
    rawFeedback: response.ai_feedback,
    exercise: {
      id: response.exercise_id ?? '',
      scenario: exerciseRow?.scenario ?? '',
      guidance: exerciseRow?.guidance ?? null,
    },
    section: {
      id: sectionRow?.id ?? response.section_id ?? '',
      slug: sectionRow?.slug ?? '',
      title: sectionRow?.title ?? 'Section',
    },
    course: {
      id: courseRow?.id ?? '',
      slug: courseRow?.slug ?? '',
      title: courseRow?.title ?? 'Course',
    },
    trainee: {
      id: traineeRow?.id ?? response.trainee_id,
      name: traineeRow?.name ?? 'Unknown',
      email: traineeRow?.email ?? '',
    },
    history: (history ?? []).map(h => ({
      id: h.id,
      score: h.ai_score,
      createdAt: h.created_at,
      transcriptionExcerpt: ((h.response_text ?? '') as string).slice(0, 80),
      isCurrent: h.id === response.id,
    })),
  };

  return NextResponse.json(payload);
}
