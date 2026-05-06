import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { getProgram, getProgramIdForSection, isTraineeEnrolled, getExerciseById } from '@/lib/programs';
import { getProgramAccessStatus, prerequisiteLockedResponse } from '@/lib/program-prerequisites';

// Helper: check enrollment for a section. Returns null if OK, or a 403 response.
// Skips check for legacy string IDs (non-UUID).
async function checkSectionEnrollment(traineeId: string, sectionId: string): Promise<NextResponse | null> {
  const programId = await getProgramIdForSection(sectionId);
  if (!programId) return null; // Legacy string ID — skip enrollment check
  if (!(await isTraineeEnrolled(traineeId, programId))) {
    return NextResponse.json({ error: 'Not enrolled in this program' }, { status: 403 });
  }
  const program = await getProgram(programId);
  if (program) {
    const accessStatus = await getProgramAccessStatus(traineeId, program);
    if (accessStatus.locked) {
      return NextResponse.json(prerequisiteLockedResponse(accessStatus), { status: 423 });
    }
  }
  return null;
}

// POST - Update progress for a section
export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { traineeId, sectionId, status } = body;

    if (!traineeId || !sectionId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the traineeId belongs to this user
    if (traineeId !== user.traineeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Enrollment check for program sections
    const enrollmentError = await checkSectionEnrollment(traineeId, sectionId);
    if (enrollmentError) return enrollmentError;

    const supabase = createAdminClient();

    const updateData: Record<string, string> = { status };

    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Update or insert progress
    const { data: existing } = await supabase
      .from('progress')
      .select('id')
      .eq('trainee_id', traineeId)
      .eq('section_id', sectionId)
      .single();

    if (existing) {
      await supabase
        .from('progress')
        .update(updateData)
        .eq('trainee_id', traineeId)
        .eq('section_id', sectionId);
    } else {
      await supabase.from('progress').insert({
        trainee_id: traineeId,
        section_id: sectionId,
        ...updateData,
      });
    }

    // Update trainee's last active timestamp
    await supabase
      .from('trainees')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', traineeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

// Store a response (for multiple choice, short answer)
export async function PUT(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { traineeId, sectionId, exerciseId, exerciseType, responseText, correct } = body;

    if (!traineeId || !sectionId || !exerciseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (traineeId !== user.traineeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Enrollment check for program sections
    const enrollmentError = await checkSectionEnrollment(traineeId, sectionId);
    if (enrollmentError) return enrollmentError;

    const supabase = createAdminClient();

    // Server-side MC grading for program exercises (UUID exerciseIds)
    let serverCorrect = correct ?? null;
    let aiScore: number | null = null;

    if (exerciseType === 'multiple_choice') {
      const exercise = await getExerciseById(exerciseId);
      if (exercise) {
        // Program exercise found — grade server-side using selectedIndex from responseText
        const selectedIndex = parseInt(responseText, 10);
        serverCorrect = !isNaN(selectedIndex) && selectedIndex === exercise.correct_index;
        aiScore = null; // MC exercises don't get AI scores
      } else {
        // Legacy string exercise IDs fall back to client-provided correctness.
        serverCorrect = correct ?? null;
        aiScore = correct ? 5 : 0;
      }
    }

    const { data: createdResponse, error: insertError } = await supabase
      .from('responses')
      .insert({
        trainee_id: traineeId,
        section_id: sectionId,
        exercise_id: exerciseId,
        exercise_type: exerciseType,
        response_text: responseText,
        ai_score: aiScore,
        correct: serverCorrect,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting response:', insertError);
      return NextResponse.json({ error: 'Failed to store response' }, { status: 500 });
    }

    return NextResponse.json({ success: true, response: createdResponse });
  } catch (error) {
    console.error('Error storing response:', error);
    return NextResponse.json({ error: 'Failed to store response' }, { status: 500 });
  }
}
