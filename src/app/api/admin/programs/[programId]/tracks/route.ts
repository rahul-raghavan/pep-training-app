import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';
import { isCourseInAdminScope } from '@/lib/admin-scope';

/**
 * GET /api/admin/programs/[programId]/tracks
 * Returns the program-track ids currently mapped to this course (programs row).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { error: authError } = await requireSuperAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from('course_programs')
    .select('track_id')
    .eq('program_id', programId);

  return NextResponse.json({
    trackIds: (rows ?? []).map(r => r.track_id),
  });
}

/**
 * PUT /api/admin/programs/[programId]/tracks
 * Body: { trackIds: string[] }
 * Replaces the course_programs rows for this course.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { programId } = await params;
  const supabase = createAdminClient();
  if (!(await isCourseInAdminScope(supabase, user, programId))) {
    return NextResponse.json({ error: 'Course is not in your admin scope' }, { status: 403 });
  }

  let body: { trackIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const trackIds = Array.isArray(body.trackIds) ? body.trackIds : [];

  // Verify course exists
  const { data: course } = await supabase
    .from('programs')
    .select('id')
    .eq('id', programId)
    .single();
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Replace mappings (small set per course — delete-then-insert is fine)
  await supabase.from('course_programs').delete().eq('program_id', programId);
  if (trackIds.length > 0) {
    const rows = trackIds.map(track_id => ({ program_id: programId, track_id }));
    const { error } = await supabase.from('course_programs').insert(rows);
    if (error) {
      console.error('course_programs insert error', error);
      return NextResponse.json({ error: 'Failed to map tracks' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, trackIds });
}
