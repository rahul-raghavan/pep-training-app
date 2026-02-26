import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { getProgramSections } from '@/lib/programs';

// POST - Enroll a trainee in a program (works for both active and pending users)
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { traineeId, programId } = await request.json();

    if (!traineeId || !programId) {
      return NextResponse.json({ error: 'traineeId and programId required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify trainee exists
    const { data: trainee } = await supabase
      .from('trainees')
      .select('id')
      .eq('id', traineeId)
      .single();

    if (!trainee) {
      return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
    }

    // Enroll
    const { error: enrollError } = await supabase.from('trainee_programs').insert({
      trainee_id: traineeId,
      program_id: programId,
    });

    if (enrollError) {
      if (enrollError.code === '23505') {
        return NextResponse.json({ error: 'Already enrolled' }, { status: 409 });
      }
      console.error('Error enrolling:', enrollError);
      return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
    }

    // Initialize progress for program sections
    const sections = await getProgramSections(programId);
    if (sections.length > 0) {
      const progressRows = sections.map(section => ({
        trainee_id: traineeId,
        section_id: section.id,
        status: 'not_started',
      }));
      await supabase.from('progress').insert(progressRows);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE - Unenroll a trainee from a program
export async function DELETE(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const traineeId = request.nextUrl.searchParams.get('traineeId');
  const programId = request.nextUrl.searchParams.get('programId');

  if (!traineeId || !programId) {
    return NextResponse.json({ error: 'traineeId and programId required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('trainee_programs')
    .delete()
    .eq('trainee_id', traineeId)
    .eq('program_id', programId);

  if (error) {
    console.error('Error unenrolling:', error);
    return NextResponse.json({ error: 'Failed to unenroll' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
