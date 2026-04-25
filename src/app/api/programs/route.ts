import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';
import { clearProgramCache } from '@/lib/programs';
import { getScopedTraineeIds } from '@/lib/admin-scope';

// GET - List all programs
export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const scopedTraineeIds = await getScopedTraineeIds(supabase, user);

  const { data: programs, error } = await supabase
    .from('programs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
  }
  let visiblePrograms = programs || [];
  if (scopedTraineeIds) {
    if (user.adminScopeTrackIds.length === 0) {
      return NextResponse.json({ programs: [] });
    }
    const { data: mapped } = await supabase
      .from('course_programs')
      .select('program_id')
      .in('track_id', user.adminScopeTrackIds);
    const visibleProgramIds = new Set((mapped ?? []).map(row => row.program_id));
    visiblePrograms = visiblePrograms.filter(program => visibleProgramIds.has(program.id));
  }

  // Get section counts and trainee counts
  const programsWithCounts = await Promise.all(
    visiblePrograms.map(async (program) => {
      let traineeQuery = supabase
        .from('trainee_programs')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', program.id);
      if (scopedTraineeIds) {
        const ids = [...scopedTraineeIds];
        if (ids.length === 0) {
          const { count: sectionCount } = await supabase
            .from('program_sections')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', program.id);
          return { ...program, sectionCount: sectionCount || 0, traineeCount: 0 };
        }
        traineeQuery = traineeQuery.in('trainee_id', ids);
      }
      const [{ count: sectionCount }, { count: traineeCount }] = await Promise.all([
        supabase.from('program_sections').select('*', { count: 'exact', head: true }).eq('program_id', program.id),
        traineeQuery,
      ]);
      return { ...program, sectionCount: sectionCount || 0, traineeCount: traineeCount || 0 };
    })
  );

  return NextResponse.json({ programs: programsWithCounts });
}

// POST - Create a program (super_admin only)
export async function POST(request: NextRequest) {
  const { error: authError } = await requireSuperAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { slug, title, description, passing_score, is_active } = body;

    if (!slug || !title) {
      return NextResponse.json({ error: 'slug and title are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('programs')
      .insert({ slug, title, description, passing_score, is_active })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating program:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A program with this slug already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create program', details: error.message, code: error.code }, { status: 500 });
    }

    clearProgramCache();
    return NextResponse.json({ program: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
