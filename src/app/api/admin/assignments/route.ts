import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { adminScopeError } from '@/lib/admin-scope';

/**
 * PUT /api/admin/assignments
 * Body: { traineeId, courseId, on }
 *
 * Toggles a trainee↔course enrollment in trainee_programs. Idempotent: setting
 * `on=true` when already enrolled is a no-op; same for `on=false` when not.
 *
 * Scope check (regular admin):
 *   • The trainee must belong to the admin's center (teacher_centers).
 *   • The trainee must overlap the admin's managed tracks (teacher_programs).
 *   • The course must be scoped (course_programs) to a track the admin manages.
 *
 * super_admin can toggle anywhere.
 */
export async function PUT(request: NextRequest) {
  const { user, error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();

  let body: { traineeId?: string; courseId?: string; on?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { traineeId, courseId, on } = body;
  if (!traineeId || !courseId || typeof on !== 'boolean') {
    return NextResponse.json(
      { error: 'traineeId, courseId, and on (boolean) are required' },
      { status: 400 }
    );
  }

  // Scope check for regular admins
  if (user.role === 'admin') {
    if (user.adminScopeCenterIds.length === 0) {
      return NextResponse.json({ error: 'Admin has no center scope assigned' }, { status: 403 });
    }
    if (user.adminScopeTrackIds.length === 0) {
      return adminScopeError();
    }

    // Trainee must be in the admin's center
    const { data: tc } = await supabase
      .from('teacher_centers')
      .select('center_id')
      .eq('trainee_id', traineeId)
      .single();
    if (!tc || !user.adminScopeCenterIds.includes(tc.center_id)) {
      return NextResponse.json({ error: 'Trainee is not in your center' }, { status: 403 });
    }

    // Trainee must be in at least one of the admin's managed tracks
    const { data: tps } = await supabase
      .from('teacher_programs')
      .select('program_id')
      .eq('trainee_id', traineeId)
      .in('program_id', user.adminScopeTrackIds);
    if (!tps || tps.length === 0) {
      return NextResponse.json(
        { error: 'Trainee is not in any of your managed program tracks' },
        { status: 403 }
      );
    }

    // Course must be scoped to at least one of the admin's managed tracks
    const { data: cps } = await supabase
      .from('course_programs')
      .select('track_id')
      .eq('program_id', courseId)
      .in('track_id', user.adminScopeTrackIds);
    if (!cps || cps.length === 0) {
      return NextResponse.json(
        { error: 'Course is not in any of your managed program tracks' },
        { status: 403 }
      );
    }
  }

  if (on) {
    // Insert. Existing rows on the same (trainee, course) pair would conflict
    // on the unique key implicit in trainee_programs — handle via upsert.
    const { error } = await supabase
      .from('trainee_programs')
      .upsert(
        { trainee_id: traineeId, program_id: courseId },
        { onConflict: 'trainee_id,program_id', ignoreDuplicates: true }
      );
    if (error) {
      console.error('assignments PUT (on) insert error', error);
      return NextResponse.json({ error: 'Failed to assign course' }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from('trainee_programs')
      .delete()
      .eq('trainee_id', traineeId)
      .eq('program_id', courseId);
    if (error) {
      console.error('assignments PUT (off) delete error', error);
      return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, traineeId, courseId, on });
}
