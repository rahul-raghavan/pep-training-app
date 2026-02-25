import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { getProgramSections, getProgramBySlug } from '@/lib/programs';

// GET - Fetch current user's trainee data
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth(request);
  if (authError) return authError;

  if (!user.traineeId) {
    return NextResponse.json({ error: 'No trainee record linked' }, { status: 404 });
  }

  const supabase = createAdminClient();

  // Fetch trainee
  const { data: trainee, error } = await supabase
    .from('trainees')
    .select('*')
    .eq('id', user.traineeId)
    .single();

  if (error || !trainee) {
    return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
  }

  // Update last active timestamp
  await supabase
    .from('trainees')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', trainee.id);

  // Fetch progress
  const { data: progress } = await supabase
    .from('progress')
    .select('*')
    .eq('trainee_id', trainee.id);

  // Fetch responses
  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('trainee_id', trainee.id);

  return NextResponse.json({
    trainee,
    progress: progress || [],
    responses: responses || [],
  });
}

// POST - Create new trainee (admin only)
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, email, program_id, program_slug } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Create trainee (no access_token needed for new users — they'll use Google auth)
    const { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .insert({
        name,
        email,
        access_token: crypto.randomUUID(),
      })
      .select()
      .single();

    if (traineeError) {
      console.error('Error creating trainee:', traineeError);
      return NextResponse.json({ error: 'Failed to create trainee' }, { status: 500 });
    }

    // If a program is specified, enroll in it and init progress for program sections
    const resolvedProgramId = program_id || (program_slug ? (await getProgramBySlug(program_slug))?.id : null);

    if (resolvedProgramId) {
      // Enroll in program
      await supabase.from('trainee_programs').insert({
        trainee_id: trainee.id,
        program_id: resolvedProgramId,
      });

      // Initialize progress for program sections
      const programSections = await getProgramSections(resolvedProgramId);
      if (programSections.length > 0) {
        const programProgressRows = programSections.map(section => ({
          trainee_id: trainee.id,
          section_id: section.id,
          status: 'not_started',
        }));
        await supabase.from('progress').insert(programProgressRows);
      }
    }

    return NextResponse.json({ trainee });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create trainee' }, { status: 500 });
  }
}
