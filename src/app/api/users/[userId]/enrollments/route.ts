import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { getProgramSections } from '@/lib/programs';

// GET - List enrollments for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { userId } = await params;
  const supabase = createAdminClient();

  // Get trainee linked to this user
  const { data: trainee } = await supabase
    .from('trainees')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!trainee) {
    return NextResponse.json({ enrollments: [] });
  }

  const { data: enrollments, error } = await supabase
    .from('trainee_programs')
    .select('id, program_id, enrolled_at, programs(title, slug)')
    .eq('trainee_id', trainee.id);

  if (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
  }

  return NextResponse.json({ enrollments: enrollments || [] });
}

// POST - Enroll user in a program
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { userId } = await params;

  try {
    const body = await request.json();
    const { programId } = body;

    if (!programId) {
      return NextResponse.json({ error: 'programId required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get trainee linked to this user
    const { data: trainee } = await supabase
      .from('trainees')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!trainee) {
      return NextResponse.json({ error: 'No trainee record for this user' }, { status: 404 });
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('trainee_programs')
      .select('id')
      .eq('trainee_id', trainee.id)
      .eq('program_id', programId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already enrolled' }, { status: 409 });
    }

    // Enroll
    const { error: enrollError } = await supabase.from('trainee_programs').insert({
      trainee_id: trainee.id,
      program_id: programId,
    });

    if (enrollError) {
      console.error('Error enrolling:', enrollError);
      return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
    }

    // Initialize progress for program sections
    const sections = await getProgramSections(programId);
    if (sections.length > 0) {
      const progressRows = sections.map(section => ({
        trainee_id: trainee.id,
        section_id: section.id,
        status: 'not_started',
      }));
      await supabase.from('progress').insert(progressRows);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error enrolling user:', error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
}

// DELETE - Unenroll user from a program
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { userId } = await params;
  const programId = request.nextUrl.searchParams.get('programId');

  if (!programId) {
    return NextResponse.json({ error: 'programId required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get trainee linked to this user
  const { data: trainee } = await supabase
    .from('trainees')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!trainee) {
    return NextResponse.json({ error: 'No trainee record for this user' }, { status: 404 });
  }

  const { error } = await supabase
    .from('trainee_programs')
    .delete()
    .eq('trainee_id', trainee.id)
    .eq('program_id', programId);

  if (error) {
    console.error('Error unenrolling:', error);
    return NextResponse.json({ error: 'Failed to unenroll' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
