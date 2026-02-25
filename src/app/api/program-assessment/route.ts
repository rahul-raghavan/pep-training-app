import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getProgramBySlug, getProgramAssessment, isTraineeEnrolled } from '@/lib/programs';

// GET - Fetch assessment questions for a program (trainee-facing)
// ?programSlug=X
// SECURITY: correctIndex and explanation are stripped — grading happens server-side via /submit
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  const programSlug = request.nextUrl.searchParams.get('programSlug');

  if (!programSlug) {
    return NextResponse.json({ error: 'programSlug is required' }, { status: 400 });
  }

  const program = await getProgramBySlug(programSlug);
  if (!program || !program.is_active) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Enrollment check
  if (!user.traineeId || !(await isTraineeEnrolled(user.traineeId, program.id))) {
    return NextResponse.json({ error: 'Not enrolled in this program' }, { status: 403 });
  }

  const questions = await getProgramAssessment(program.id);

  return NextResponse.json({
    program: {
      id: program.id,
      title: program.title,
      passing_score: program.passing_score,
    },
    questions: questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      module: q.module_label,
    })),
    totalQuestions: questions.length,
    passingScore: Math.ceil(questions.length * (program.passing_score / 100)),
  });
}
