import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { isCourseInAdminScope, isTraineeInAdminScope } from '@/lib/admin-scope';

interface ResponseRow {
  id: string;
  trainee_id: string;
  section_id: string;
  exercise_id: string;
  response_text: string | null;
  audio_url: string | null;
  ai_feedback: string | null;
  ai_score: number | null;
  correct: boolean | null;
  exercise_type: 'voice' | 'multiple_choice' | 'short_answer';
  created_at: string;
}

interface ProgressRow {
  trainee_id: string;
  section_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
}

interface AssessmentAttemptRow {
  id: string;
  trainee_id: string;
  program_id: string;
  score: number;
  total: number;
  answers: unknown;
  created_at: string;
}

/**
 * GET /api/manager/trainee/[id]
 *
 * Returns one stat-block per enrolled course (programs row). When a teacher
 * is enrolled in multiple courses we no longer collapse everything into a
 * single set of numbers — each course gets its own progress, avg score,
 * responses, assessment, and needs-attention count.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { id: traineeId } = await params;
  const supabase = createAdminClient();

  const { data: trainee, error: traineeError } = await supabase
    .from('trainees')
    .select('*')
    .eq('id', traineeId)
    .single();

  if (traineeError || !trainee) {
    return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
  }
  if (!(await isTraineeInAdminScope(supabase, user, traineeId))) {
    return NextResponse.json({ error: 'Trainee is not in your admin scope' }, { status: 403 });
  }

  // All enrolled courses
  const { data: enrollments } = await supabase
    .from('trainee_programs')
    .select('program_id, programs(id, slug, title, passing_score)')
    .eq('trainee_id', traineeId);

  if (!enrollments || enrollments.length === 0) {
    return NextResponse.json({
      trainee,
      courses: [],
    });
  }

  // Pull each course's full details + everything for the trainee in one shot
  let courseIds = enrollments
    .map(e => (e.programs as unknown as { id?: string })?.id)
    .filter((id): id is string => !!id);
  if (user.role === 'admin') {
    const scopedCourseIds = new Set<string>();
    await Promise.all(
      courseIds.map(async courseId => {
        if (await isCourseInAdminScope(supabase, user, courseId)) scopedCourseIds.add(courseId);
      })
    );
    courseIds = courseIds.filter(courseId => scopedCourseIds.has(courseId));
  }

  if (courseIds.length === 0) {
    return NextResponse.json({ trainee, courses: [] });
  }

  const visibleCourseIds = new Set(courseIds);

  const [
    sectionsRes,
    exercisesRes,
    progressRes,
    responsesRes,
    questionsRes,
    attemptsRes,
  ] = await Promise.all([
    supabase
      .from('program_sections')
      .select('id, program_id, slug, title, sort_order, estimated_minutes')
      .in('program_id', courseIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('program_exercises')
      .select('id, section_id, exercise_type, question, scenario')
      .in('section_id', /* fill below */ ['_none_']),
    supabase
      .from('progress')
      .select('trainee_id, section_id, status, started_at, completed_at')
      .eq('trainee_id', traineeId),
    supabase
      .from('responses')
      .select('id, trainee_id, section_id, exercise_id, response_text, audio_url, ai_feedback, ai_score, correct, exercise_type, created_at')
      .eq('trainee_id', traineeId)
      .order('created_at', { ascending: true }),
    supabase
      .from('program_assessment_questions')
      .select('id, program_id')
      .in('program_id', courseIds),
    supabase
      .from('assessment_attempts')
      .select('id, trainee_id, program_id, score, total, answers, created_at')
      .eq('trainee_id', traineeId)
      .order('created_at', { ascending: false }),
  ]);

  const sections = sectionsRes.data ?? [];
  // Re-fetch exercises now that we know the section ids.
  const sectionIds = sections.map(s => s.id);
  const exercises = sectionIds.length
    ? (
        (
          await supabase
            .from('program_exercises')
            .select('id, section_id, exercise_type, question, scenario')
            .in('section_id', sectionIds)
            .order('sort_order', { ascending: true })
        ).data ?? []
      )
    : [];
  void exercisesRes; // discard the placeholder query result

  const progress = (progressRes.data ?? []) as ProgressRow[];
  const responses = (responsesRes.data ?? []) as ResponseRow[];
  const questions = questionsRes.data ?? [];
  const attempts = (attemptsRes.data ?? []) as AssessmentAttemptRow[];

  // Group sections by program
  const sectionsByProgram = new Map<string, typeof sections>();
  for (const s of sections) {
    const arr = sectionsByProgram.get(s.program_id) ?? [];
    arr.push(s);
    sectionsByProgram.set(s.program_id, arr);
  }

  // Group exercises by section
  const exercisesBySection = new Map<string, typeof exercises>();
  for (const e of exercises) {
    const arr = exercisesBySection.get(e.section_id) ?? [];
    arr.push(e);
    exercisesBySection.set(e.section_id, arr);
  }

  // Group questions by program
  const questionsByProgram = new Map<string, number>();
  for (const q of questions) {
    questionsByProgram.set(q.program_id, (questionsByProgram.get(q.program_id) ?? 0) + 1);
  }

  // Group attempts by program
  const attemptsByProgram = new Map<string, AssessmentAttemptRow[]>();
  for (const a of attempts) {
    const arr = attemptsByProgram.get(a.program_id) ?? [];
    arr.push(a);
    attemptsByProgram.set(a.program_id, arr);
  }

  // Build per-course block
  const courses = enrollments
    .map(e => {
      const program = e.programs as unknown as
        | { id: string; slug: string; title: string; passing_score: number }
        | null;
      if (!program) return null;
      if (!visibleCourseIds.has(program.id)) return null;

      const courseSections = sectionsByProgram.get(program.id) ?? [];
      const courseSectionIds = new Set(courseSections.map(s => s.id));
      const courseResponses = responses.filter(r => courseSectionIds.has(r.section_id));

      const sectionSummaries = courseSections.map(section => {
        const sectionProgress = progress.find(p => p.section_id === section.id);
        const sectionResponses = courseResponses.filter(r => r.section_id === section.id);
        const sectionExercises = exercisesBySection.get(section.id) ?? [];

        const voiceResponses = sectionResponses.filter(
          r => r.exercise_type === 'voice' && r.ai_score
        );
        const mcqResponses = sectionResponses.filter(
          r => r.exercise_type === 'multiple_choice' && r.correct !== null
        );

        let avgScore: number | null = null;
        let scoreType: 'voice' | 'mcq' | null = null;
        if (voiceResponses.length > 0) {
          avgScore =
            Math.round(
              (voiceResponses.reduce((sum, r) => sum + (r.ai_score ?? 0), 0) /
                voiceResponses.length) *
                10
            ) / 10;
          scoreType = 'voice';
        } else if (mcqResponses.length > 0) {
          const correctCount = mcqResponses.filter(r => r.correct === true).length;
          avgScore = Math.round((correctCount / mcqResponses.length) * 100);
          scoreType = 'mcq';
        }

        const needsAttention =
          scoreType === 'voice'
            ? avgScore !== null && avgScore < 3
            : scoreType === 'mcq'
            ? avgScore !== null && avgScore < 60
            : false;

        const exercisesForSection = sectionExercises.map(exercise => {
          const exerciseResponses = sectionResponses.filter(
            r => r.exercise_id === exercise.id
          );
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
              id: r.id,
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
          exercises: exercisesForSection,
          totalResponses: sectionResponses.length,
        };
      });

      const completedSections = sectionSummaries.filter(s => s.status === 'completed').length;
      const totalSections = sectionSummaries.length;

      const courseVoiceScores = courseResponses
        .filter(r => r.exercise_type === 'voice' && r.ai_score)
        .map(r => r.ai_score!);
      const courseMcqResponses = courseResponses.filter(
        r => r.exercise_type === 'multiple_choice' && r.correct !== null
      );

      let overallAvgScore: number | null = null;
      let overallScoreType: 'voice' | 'mcq' | null = null;
      if (courseVoiceScores.length > 0) {
        overallAvgScore =
          Math.round(
            (courseVoiceScores.reduce((a, b) => a + b, 0) / courseVoiceScores.length) * 10
          ) / 10;
        overallScoreType = 'voice';
      } else if (courseMcqResponses.length > 0) {
        const correctCount = courseMcqResponses.filter(r => r.correct === true).length;
        overallAvgScore = Math.round((correctCount / courseMcqResponses.length) * 100);
        overallScoreType = 'mcq';
      }

      const totalAssessmentQuestions = questionsByProgram.get(program.id) ?? 0;
      const passingScorePercent = program.passing_score ?? 80;
      const passingScoreCount = Math.ceil((totalAssessmentQuestions * passingScorePercent) / 100);

      const courseAttempts = attemptsByProgram.get(program.id) ?? [];
      const bestAssessmentScore =
        courseAttempts.length > 0 ? Math.max(...courseAttempts.map(a => a.score)) : null;

      return {
        courseId: program.id,
        slug: program.slug,
        title: program.title,
        passingScore: passingScoreCount,
        totalAssessmentQuestions,
        sections: sectionSummaries,
        assessmentAttempts: courseAttempts,
        stats: {
          completedSections,
          totalSections,
          progressPercent:
            totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0,
          overallAvgScore,
          overallScoreType,
          totalResponses: courseResponses.length,
          sectionsNeedingAttention: sectionSummaries.filter(s => s.needsAttention).length,
          assessmentAttempts: courseAttempts.length,
          bestAssessmentScore,
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.title.localeCompare(b.title));

  return NextResponse.json({
    trainee,
    courses,
  });
}
