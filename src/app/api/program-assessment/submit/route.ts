import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { getProgramBySlug, getProgramAssessment, isTraineeEnrolled } from '@/lib/programs';

// POST - Submit assessment answers for server-side grading
export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { programSlug, answers } = body as {
      programSlug: string;
      answers: Record<string, number>;
    };

    if (!programSlug || !answers) {
      return NextResponse.json({ error: 'programSlug and answers are required' }, { status: 400 });
    }

    if (!user.traineeId) {
      return NextResponse.json({ error: 'No trainee profile linked' }, { status: 403 });
    }

    const program = await getProgramBySlug(programSlug);
    if (!program || !program.is_active) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Enrollment check
    if (!(await isTraineeEnrolled(user.traineeId, program.id))) {
      return NextResponse.json({ error: 'Not enrolled in this program' }, { status: 403 });
    }

    // Fetch correct answers server-side
    const questions = await getProgramAssessment(program.id);

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No assessment questions found' }, { status: 404 });
    }

    // Grade server-side
    const details = questions.map(q => {
      const selectedIndex = answers[q.id];
      const correct = selectedIndex === q.correct_index;
      return {
        questionId: q.id,
        correct,
        selectedIndex: selectedIndex ?? -1,
        correctIndex: q.correct_index,
        question: q.question,
        options: q.options,
        explanation: q.explanation,
        module: q.module_label,
      };
    });

    const score = details.filter(d => d.correct).length;
    const total = questions.length;
    const passingScore = Math.ceil(total * (program.passing_score / 100));
    const passed = score >= passingScore;

    // Save attempt with program_id
    const supabase = createAdminClient();
    await supabase.from('assessment_attempts').insert({
      trainee_id: user.traineeId,
      score,
      total,
      answers,
      program_id: program.id,
    });

    // Update trainee's last active timestamp
    await supabase
      .from('trainees')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.traineeId);

    return NextResponse.json({
      score,
      total,
      passed,
      passingScore,
      details,
    });
  } catch (error) {
    console.error('Error in assessment submit:', error);
    return NextResponse.json({ error: 'Failed to submit assessment' }, { status: 500 });
  }
}
