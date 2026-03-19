import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

// GET - Fetch detailed info for a specific trainee (program-engine only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { id: traineeId } = await params;
  const supabase = createAdminClient();

  // Fetch trainee
  const { data: trainee, error: traineeError } = await supabase
    .from('trainees')
    .select('*')
    .eq('id', traineeId)
    .single();

  if (traineeError || !trainee) {
    return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
  }

  // Find the trainee's enrolled program
  const { data: enrollment } = await supabase
    .from('trainee_programs')
    .select('program_id, programs(title, slug, passing_score)')
    .eq('trainee_id', traineeId)
    .limit(1)
    .single();

  // If not enrolled in any program, return empty sections
  if (!enrollment) {
    return NextResponse.json({
      trainee,
      sections: [],
      assessmentAttempts: [],
      stats: {
        completedSections: 0,
        totalSections: 0,
        progressPercent: 0,
        overallAvgScore: null,
        totalResponses: 0,
        sectionsNeedingAttention: 0,
        assessmentAttempts: 0,
        bestAssessmentScore: null,
      },
    });
  }

  const programId = enrollment.program_id;

  // Fetch program sections ordered by sort_order
  const { data: programSections } = await supabase
    .from('program_sections')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true });

  // Fetch program exercises for all sections
  const sectionIds = (programSections || []).map(s => s.id);
  const { data: programExercises } = await supabase
    .from('program_exercises')
    .select('*')
    .in('section_id', sectionIds.length > 0 ? sectionIds : ['_none_'])
    .order('sort_order', { ascending: true });

  // Fetch trainee progress for these sections
  const { data: progress } = await supabase
    .from('progress')
    .select('*')
    .eq('trainee_id', traineeId)
    .in('section_id', sectionIds.length > 0 ? sectionIds : ['_none_']);

  // Fetch trainee responses for these sections
  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('trainee_id', traineeId)
    .in('section_id', sectionIds.length > 0 ? sectionIds : ['_none_'])
    .order('created_at', { ascending: true });

  // Build section-by-section summary from DB data
  const sectionSummaries = (programSections || []).map(section => {
    const sectionProgress = progress?.find(p => p.section_id === section.id);
    const sectionResponses = responses?.filter(r => r.section_id === section.id) || [];
    const sectionExercises = programExercises?.filter(e => e.section_id === section.id) || [];

    const voiceResponses = sectionResponses.filter(r => r.exercise_type === 'voice' && r.ai_score);
    const mcqResponses = sectionResponses.filter(r => r.exercise_type === 'multiple_choice' && r.correct !== null);

    let avgScore: number | null = null;
    let scoreType: 'voice' | 'mcq' | null = null;
    if (voiceResponses.length > 0) {
      avgScore = Math.round(voiceResponses.reduce((sum, r) => sum + (r.ai_score || 0), 0) / voiceResponses.length * 10) / 10;
      scoreType = 'voice';
    } else if (mcqResponses.length > 0) {
      const correctCount = mcqResponses.filter(r => r.correct === true).length;
      avgScore = Math.round((correctCount / mcqResponses.length) * 100);
      scoreType = 'mcq';
    }

    const needsAttention = scoreType === 'voice' ? (avgScore !== null && avgScore < 3) :
      scoreType === 'mcq' ? (avgScore !== null && avgScore < 60) : false;

    // Build exercises with their responses
    const exercises = sectionExercises.map(exercise => {
      const exerciseResponses = sectionResponses.filter(r => r.exercise_id === exercise.id);

      let questionText = '';
      if (exercise.exercise_type === 'multiple_choice') {
        questionText = exercise.question || '';
      } else if (exercise.exercise_type === 'voice') {
        questionText = exercise.scenario || '';
      } else if (exercise.exercise_type === 'short_answer') {
        questionText = exercise.question || '';
      }

      return {
        exerciseId: exercise.id,
        exerciseType: exercise.exercise_type,
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
      scoreType,
      needsAttention,
      exercises,
      totalResponses: sectionResponses.length,
    };
  });

  // Fetch assessment question count for this program
  const { data: assessmentQuestions } = await supabase
    .from('program_assessment_questions')
    .select('id')
    .eq('program_id', programId);
  const totalAssessmentQuestions = assessmentQuestions?.length || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const programData = enrollment.programs as any;
  const passingScorePercent = programData?.passing_score ?? 80;
  const passingScoreCount = Math.ceil(totalAssessmentQuestions * passingScorePercent / 100);

  // Fetch assessment attempts
  const { data: assessmentAttempts } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: false });

  // Calculate overall stats — only count responses within program sections
  const completedSections = sectionSummaries.filter(s => s.status === 'completed').length;
  const totalSections = sectionSummaries.length;
  const allVoiceScores = (responses || [])
    .filter(r => r.exercise_type === 'voice' && r.ai_score)
    .map(r => r.ai_score!);
  const allMcqResponses = (responses || [])
    .filter(r => r.exercise_type === 'multiple_choice' && r.correct !== null);

  let overallAvgScore: number | null = null;
  let overallScoreType: 'voice' | 'mcq' | null = null;
  if (allVoiceScores.length > 0) {
    overallAvgScore = Math.round(allVoiceScores.reduce((a, b) => a + b, 0) / allVoiceScores.length * 10) / 10;
    overallScoreType = 'voice';
  } else if (allMcqResponses.length > 0) {
    const correctCount = allMcqResponses.filter(r => r.correct === true).length;
    overallAvgScore = Math.round((correctCount / allMcqResponses.length) * 100);
    overallScoreType = 'mcq';
  }

  const bestAssessmentScore = assessmentAttempts && assessmentAttempts.length > 0
    ? Math.max(...assessmentAttempts.map(a => a.score))
    : null;

  return NextResponse.json({
    trainee,
    sections: sectionSummaries,
    assessmentAttempts: assessmentAttempts || [],
    programInfo: {
      passingScore: passingScoreCount,
      totalAssessmentQuestions,
    },
    stats: {
      completedSections,
      totalSections,
      progressPercent: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0,
      overallAvgScore,
      overallScoreType,
      totalResponses: (responses || []).length,
      sectionsNeedingAttention: sectionSummaries.filter(s => s.needsAttention).length,
      assessmentAttempts: assessmentAttempts?.length || 0,
      bestAssessmentScore,
    },
  });
}
