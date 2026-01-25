import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sections } from '@/content/sections';

// GET - Fetch detailed info for a specific trainee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check for manager session
  const session = request.cookies.get('manager_session');
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: traineeId } = await params;
  const supabase = createServerClient();

  // Fetch trainee
  const { data: trainee, error: traineeError } = await supabase
    .from('trainees')
    .select('*')
    .eq('id', traineeId)
    .single();

  if (traineeError || !trainee) {
    return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
  }

  // Fetch progress
  const { data: progress } = await supabase
    .from('progress')
    .select('*')
    .eq('trainee_id', traineeId);

  // Fetch responses
  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: true });

  // Build section-by-section summary
  const sectionSummaries = sections.map(section => {
    const sectionProgress = progress?.find(p => p.section_id === section.id);
    const sectionResponses = responses?.filter(r => r.section_id === section.id) || [];

    const voiceResponses = sectionResponses.filter(r => r.exercise_type === 'voice');
    const avgScore = voiceResponses.length > 0
      ? Math.round(voiceResponses.reduce((sum, r) => sum + (r.ai_score || 0), 0) / voiceResponses.length * 10) / 10
      : null;

    // Flag sections with low scores
    const needsAttention = avgScore !== null && avgScore < 3;

    // Build exercises with their responses
    const exercises = section.exercises.map(exercise => {
      const exerciseResponses = sectionResponses.filter(r => r.exercise_id === exercise.id);

      let questionText = '';
      if (exercise.type === 'multiple_choice') {
        questionText = exercise.question;
      } else if (exercise.type === 'voice') {
        questionText = exercise.scenario;
      }

      return {
        exerciseId: exercise.id,
        exerciseType: exercise.type,
        questionText,
        attempts: exerciseResponses.map(r => ({
          transcription: r.response_text,
          audioUrl: r.audio_url,
          feedback: r.ai_feedback,
          score: r.ai_score,
          correct: r.correct,
          createdAt: r.created_at,
        })),
      };
    });

    return {
      id: section.id,
      title: section.title,
      status: sectionProgress?.status || 'not_started',
      startedAt: sectionProgress?.started_at,
      completedAt: sectionProgress?.completed_at,
      avgScore,
      needsAttention,
      exercises,
      // Keep responses for backward compatibility with stats
      totalResponses: sectionResponses.length,
    };
  });

  // Fetch assessment attempts
  const { data: assessmentAttempts } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: false });

  // Calculate overall stats
  const completedSections = sectionSummaries.filter(s => s.status === 'completed').length;
  const allVoiceScores = responses?.filter(r => r.exercise_type === 'voice' && r.ai_score).map(r => r.ai_score!) || [];
  const overallAvgScore = allVoiceScores.length > 0
    ? Math.round(allVoiceScores.reduce((a, b) => a + b, 0) / allVoiceScores.length * 10) / 10
    : null;

  // Best assessment score
  const bestAssessmentScore = assessmentAttempts && assessmentAttempts.length > 0
    ? Math.max(...assessmentAttempts.map(a => a.score))
    : null;

  return NextResponse.json({
    trainee,
    sections: sectionSummaries,
    assessmentAttempts: assessmentAttempts || [],
    stats: {
      completedSections,
      totalSections: sections.length,
      progressPercent: Math.round((completedSections / sections.length) * 100),
      overallAvgScore,
      totalResponses: responses?.length || 0,
      sectionsNeedingAttention: sectionSummaries.filter(s => s.needsAttention).length,
      assessmentAttempts: assessmentAttempts?.length || 0,
      bestAssessmentScore,
    },
  });
}
