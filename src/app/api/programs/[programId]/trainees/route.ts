import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { getProgramSections } from '@/lib/programs';

type Params = { params: Promise<{ programId: string }> };

// GET - List enrolled trainees with progress
export async function GET(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  const supabase = createAdminClient();

  // Get enrollments with trainee data
  const { data: enrollments, error } = await supabase
    .from('trainee_programs')
    .select('*, trainees(*)')
    .eq('program_id', programId);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch trainees' }, { status: 500 });
  }

  // Get sections for this program to calculate progress
  const sections = await getProgramSections(programId);
  const sectionIds = sections.map(s => s.id);

  // Get progress for all trainees in this program
  const traineeIds = (enrollments || []).map((e: { trainee_id: string }) => e.trainee_id);

  let progressData: Record<string, unknown>[] = [];
  if (traineeIds.length > 0) {
    const { data } = await supabase
      .from('progress')
      .select('*')
      .in('trainee_id', traineeIds)
      .in('section_id', sectionIds);
    progressData = data || [];
  }

  const trainees = (enrollments || [])
    .filter((enrollment: Record<string, unknown>) => {
      const trainee = enrollment.trainees as Record<string, unknown> | null;
      return !trainee?.is_test_account;
    })
    .map((enrollment: Record<string, unknown>) => {
    const trainee = enrollment.trainees as Record<string, unknown>;
    const traineeProgress = progressData.filter(
      (p: Record<string, unknown>) => p.trainee_id === enrollment.trainee_id
    );
    const completedSections = traineeProgress.filter(
      (p: Record<string, unknown>) => p.status === 'completed'
    ).length;

    return {
      ...trainee,
      enrolled_at: enrollment.enrolled_at,
      completedSections,
      totalSections: sections.length,
      progressPercent: sections.length > 0 ? Math.round((completedSections / sections.length) * 100) : 0,
    };
  });

  return NextResponse.json({ trainees });
}

// POST - Enroll a trainee in a program
export async function POST(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  try {
    const body = await request.json();
    const { trainee_id } = body;

    if (!trainee_id) {
      return NextResponse.json({ error: 'trainee_id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Enroll trainee
    const { data, error } = await supabase
      .from('trainee_programs')
      .insert({ trainee_id, program_id: programId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Trainee already enrolled in this program' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to enroll trainee' }, { status: 500 });
    }

    // Initialize progress for all program sections
    const sections = await getProgramSections(programId);
    if (sections.length > 0) {
      const progressRows = sections.map(section => ({
        trainee_id,
        section_id: section.id,
        status: 'not_started',
      }));
      await supabase.from('progress').insert(progressRows);
    }

    return NextResponse.json({ enrollment: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
